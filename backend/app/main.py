import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import TelemetryPayload, EventRecord, SerialConfig, ThresholdConfig
from .database import init_db, insert_event, get_events, clear_events, get_setting, set_setting
from .websocket_manager import ws_manager
from .serial_reader import serial_reader

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("syncore.main")

# In-memory latest telemetry state
latest_telemetry: Dict[str, Any] = {
    "linear_accel": 0.12,
    "gyro": 3.4,
    "roll": 0.5,
    "pitch": 1.2,
    "tilt_alert": False,
    "motion_alert": False,
    "alarm": False,
    "status": "MONITORING",
    "ax": 0.02,
    "ay": -0.01,
    "az": 1.01,
    "gx": 1.2,
    "gy": -0.8,
    "gz": 0.4,
    "timestamp": datetime.utcnow().isoformat(),
    "is_simulated": True
}

def on_hardware_telemetry(data: Dict[str, Any]):
    global latest_telemetry
    data["timestamp"] = datetime.utcnow().isoformat()
    data["is_simulated"] = False
    latest_telemetry = data
    
    # Check if alarm activated on hardware to persist to SQLite
    if data.get("alarm") and not latest_telemetry.get("alarm"):
        insert_event({
            "type": "CRASH_OR_TILT_ALARM",
            "category": "Excessive Tilt" if data.get("tilt_alert") else "Sudden Movement",
            "severity": "alarm",
            "message": "Hardware crash detector triggered alarm status.",
            "linear_accel": data.get("linear_accel"),
            "gyro": data.get("gyro"),
            "roll": data.get("roll"),
            "pitch": data.get("pitch"),
            "alarm": True,
            "timestamp": data["timestamp"]
        })

    # Dispatch to WebSocket async loop
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast({"type": "telemetry", "payload": latest_telemetry}),
                loop
            )
    except Exception as e:
        logger.debug(f"Broadcast threadsafe notice: {e}")

serial_reader.on_telemetry_callback = on_hardware_telemetry

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing SYNCORE backend database...")
    init_db()
    logger.info("SYNCORE FastAPI backend online.")
    yield
    # Shutdown
    serial_reader.disconnect()
    logger.info("SYNCORE backend stopped.")

app = FastAPI(
    title="SYNCORE — Intelligent Crash Detection Backend API",
    description="FastAPI service for ESP32 MPU6050 crash detection telemetry, serial UART bridge and SQLite audit persistence.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REST Endpoints ---

@app.get("/api/health")
def get_health():
    return {
        "status": "online",
        "service": "SYNCORE Crash Detection Kernel",
        "timestamp": datetime.utcnow().isoformat(),
        "serial_connected": serial_reader.is_running
    }

@app.get("/api/telemetry/latest")
def get_latest_telemetry():
    return latest_telemetry

@app.get("/api/events")
def list_events(limit: int = 100, category: str = "ALL"):
    return get_events(limit=limit, category=category)

@app.post("/api/events")
def record_event(evt: EventRecord):
    event_id = insert_event(evt.model_dump())
    return {"status": "recorded", "event_id": event_id}

@app.delete("/api/events")
def purge_events():
    deleted = clear_events()
    return {"status": "cleared", "deleted_count": deleted}

@app.get("/api/ports")
def get_available_ports():
    return serial_reader.list_ports()

@app.post("/api/device/connect")
def connect_device(config: SerialConfig):
    success = serial_reader.connect(port=config.port, baud_rate=config.baud_rate)
    if not success:
        return {
            "status": "error",
            "message": f"Could not open port {config.port}. Ensure ESP32 is plugged in and not busy in another program (e.g. Arduino IDE Serial Monitor)."
        }
    return {
        "status": "connected",
        "port": config.port,
        "baud_rate": config.baud_rate,
        "message": f"PySerial bridge established on {config.port}."
    }

@app.post("/api/device/disconnect")
def disconnect_device():
    serial_reader.disconnect()
    return {"status": "disconnected", "message": "ESP32 serial connection closed."}

@app.post("/api/device/calibrate")
def calibrate_device():
    success = serial_reader.send_command({"cmd": "CALIBRATE"})
    return {
        "status": "success" if success else "simulated",
        "message": "MPU6050 accelerometer & gyroscope zero-offsets calibrated successfully."
    }

@app.get("/api/device/thresholds")
def get_thresholds():
    thresholds = get_setting("thresholds")
    return thresholds or {
        "linearAccelThreshold": 2.5,
        "tiltThreshold": 45.0,
        "gyroThreshold": 200.0
    }

@app.post("/api/device/thresholds")
def update_thresholds(cfg: ThresholdConfig):
    set_setting("thresholds", cfg.model_dump())
    serial_reader.send_command({"cmd": "SET_THRESHOLDS", "thresholds": cfg.model_dump()})
    return {
        "status": "updated",
        "thresholds": cfg.model_dump(),
        "message": "Thresholds synchronized with hardware."
    }

# --- WebSocket Stream ---

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Initial greeting with current state
        await websocket.send_json({"type": "telemetry", "payload": latest_telemetry})
        
        while True:
            # Listen for client command packets
            data = await websocket.receive_text()
            try:
                msg = asyncio.iscoroutine(data)
                # Parse commands from frontend
                import json
                payload = json.loads(data)
                cmd = payload.get("command")
                if cmd == "RESET_ALARM":
                    latest_telemetry["alarm"] = False
                    latest_telemetry["motion_alert"] = False
                    latest_telemetry["tilt_alert"] = False
                    serial_reader.send_command({"cmd": "RESET_ALARM"})
                    await ws_manager.broadcast({"type": "telemetry", "payload": latest_telemetry})
                elif cmd == "MANUAL_TEST":
                    latest_telemetry["alarm"] = True
                    serial_reader.send_command({"cmd": "MANUAL_TEST"})
                    await ws_manager.broadcast({"type": "telemetry", "payload": latest_telemetry})
            except Exception as parse_err:
                logger.error(f"Error handling WebSocket message: {parse_err}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
