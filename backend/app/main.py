import asyncio
import os
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import (
    TelemetryPayload,
    EventRecord,
    SerialConfig,
    ThresholdConfig,
    ConnectionState,
    ConnectionStatus
)
from .database import (
    init_db,
    insert_event,
    get_events,
    clear_events,
    get_setting,
    set_setting
)
from .websocket_manager import ws_manager
from .serial_reader import serial_reader

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("syncore.main")

# State trackers for edge-triggered incident logging
last_alarm_state = False
last_tilt_alert_state = False
last_motion_alert_state = False

# Latest live telemetry received from ESP32
latest_hardware_telemetry: Optional[Dict[str, Any]] = None

# Reference to the main asyncio event loop for threadsafe dispatches
main_loop: Optional[asyncio.AbstractEventLoop] = None


def on_hardware_telemetry_received(data: Dict[str, Any]):
    """
    Called on the serial reader worker thread whenever a validated JSON telemetry
    packet is received from the ESP32.
    """
    global latest_hardware_telemetry, last_alarm_state, last_tilt_alert_state, last_motion_alert_state
    
    timestamp = datetime.utcnow().isoformat()
    data["timestamp"] = timestamp
    data["is_simulated"] = False
    latest_hardware_telemetry = data

    # 1. Edge-triggered Event Storage in SQLite Database
    is_alarm = data.get("alarm", False)
    is_tilt = data.get("tilt_alert", False)
    is_motion = data.get("motion_alert", False)

    recorded_event = None

    # New alarm activation
    if is_alarm and not last_alarm_state:
        cat = "Impact Trigger" if (is_tilt and is_motion) else ("Excessive Tilt" if is_tilt else "Sudden Movement")
        sev = "critical" if (is_tilt and is_motion) else "alarm"
        msg = (
            f"Hardware alarm activated on ESP32. "
            f"Roll: {data.get('roll')}°, Linear Accel: {data.get('linear_accel')} G, Gyro: {data.get('gyro')} °/s."
        )
        recorded_event = {
            "type": "HARDWARE_ALARM_ACTIVATED",
            "category": cat,
            "severity": sev,
            "message": msg,
            "linear_accel": data.get("linear_accel"),
            "gyro": data.get("gyro"),
            "roll": data.get("roll"),
            "pitch": data.get("pitch"),
            "alarm": True,
            "timestamp": timestamp
        }
    elif is_tilt and not last_tilt_alert_state:
        # Tilt warning edge
        recorded_event = {
            "type": "EXCESSIVE_TILT_ALERT",
            "category": "Excessive Tilt",
            "severity": "alarm" if is_alarm else "warning",
            "message": f"ESP32 detected excessive sideways tilt angle ({data.get('roll')}°).",
            "linear_accel": data.get("linear_accel"),
            "gyro": data.get("gyro"),
            "roll": data.get("roll"),
            "pitch": data.get("pitch"),
            "alarm": is_alarm,
            "timestamp": timestamp
        }
    elif is_motion and not last_motion_alert_state:
        # Sudden acceleration spike edge
        recorded_event = {
            "type": "SUDDEN_MOVEMENT_ALERT",
            "category": "Sudden Movement",
            "severity": "warning",
            "message": f"ESP32 detected sudden acceleration spike ({data.get('linear_accel')} G).",
            "linear_accel": data.get("linear_accel"),
            "gyro": data.get("gyro"),
            "roll": data.get("roll"),
            "pitch": data.get("pitch"),
            "alarm": is_alarm,
            "timestamp": timestamp
        }

    last_alarm_state = is_alarm
    last_tilt_alert_state = is_tilt
    last_motion_alert_state = is_motion

    if recorded_event:
        event_id = insert_event(recorded_event)
        recorded_event["id"] = event_id
        logger.info(f"Persistent event recorded in SQLite: {recorded_event['category']} ({event_id})")

    # 2. Forward to React Frontend via FastAPI WebSockets
    if main_loop and main_loop.is_running():
        try:
            # Broadcast telemetry packet
            asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast({"type": "telemetry", "payload": data}),
                main_loop
            )
            # If an incident was logged, broadcast event packet
            if recorded_event:
                asyncio.run_coroutine_threadsafe(
                    ws_manager.broadcast({"type": "event", "payload": recorded_event}),
                    main_loop
                )
        except Exception as e:
            logger.debug(f"Broadcast threadsafe dispatch exception: {e}")


def on_serial_status_changed(status: ConnectionStatus):
    """
    Called when the serial connection state transitions (CONNECTED, DISCONNECTED, ERROR).
    Broadcasting this ensures the React dashboard displays live hardware status.
    """
    if main_loop and main_loop.is_running():
        try:
            asyncio.run_coroutine_threadsafe(
                ws_manager.broadcast({
                    "type": "connection_status",
                    "payload": status.model_dump()
                }),
                main_loop
            )
        except Exception as e:
            logger.debug(f"Connection status broadcast exception: {e}")


serial_reader.on_telemetry = on_hardware_telemetry_received
serial_reader.on_status_change = on_serial_status_changed


@asynccontextmanager
async def lifespan(app: FastAPI):
    global main_loop
    main_loop = asyncio.get_running_loop()

    # 1. Initialize SQLite Database
    logger.info("Initializing SYNCORE backend database...")
    init_db()

    # 2. Configure default serial port settings (COM5 @ 115200)
    saved_cfg = get_setting("serial_config")
    default_port = os.environ.get("SYNCORE_SERIAL_PORT", (saved_cfg.get("port") if saved_cfg else "COM5"))
    default_baud = int(os.environ.get("SYNCORE_BAUD_RATE", (saved_cfg.get("baud_rate") if saved_cfg else 115200)))

    logger.info(f"SYNCORE serial manager configured for {default_port} @ {default_baud} baud.")
    
    # Attempt automatic initial connection if ESP32 is plugged in
    serial_reader.connect(port=default_port, baud_rate=default_baud, auto_reconnect=True)

    yield

    # Shutdown: cleanly disconnect serial and release file lock
    logger.info("Shutting down SYNCORE backend...")
    serial_reader.disconnect()
    logger.info("SYNCORE backend stopped.")


app = FastAPI(
    title="SYNCORE — Intelligent Crash Detection Backend API",
    description="Python FastAPI service for ESP32 MPU6050 crash detection telemetry, serial UART bridge and SQLite audit persistence.",
    version="1.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- REST API Endpoints ---

@app.get("/api/health")
def get_health():
    return {
        "status": "online",
        "service": "SYNCORE Crash Detection Kernel",
        "timestamp": datetime.utcnow().isoformat(),
        "serial_state": serial_reader.status.state.value,
        "port": serial_reader.port,
        "baud_rate": serial_reader.baud_rate,
        "packets_received": serial_reader.packets_received
    }

@app.get("/api/device/status", response_model=ConnectionStatus)
def get_device_status():
    """Returns detailed connection state: CONNECTED, DISCONNECTED, or ERROR."""
    return serial_reader.status

@app.get("/api/telemetry/latest")
def get_latest_telemetry():
    """
    Returns latest real sensor telemetry.
    Requirement 10: Does not generate fake readings when the ESP32 is disconnected.
    """
    if latest_hardware_telemetry is not None:
        return latest_hardware_telemetry
    return {
        "status": "NO_HARDWARE_DATA",
        "connection_state": serial_reader.status.state.value,
        "message": "No live ESP32 telemetry received yet. Ensure ESP32 is connected."
    }

@app.get("/api/ports")
def get_available_ports():
    """Lists hardware serial COM ports detected on the system."""
    return serial_reader.list_ports()

@app.post("/api/device/connect")
def connect_device(config: SerialConfig):
    """
    Connects to the specified COM port (e.g. COM5) and baud rate (115200).
    Saves configuration to persistent database.
    """
    set_setting("serial_config", config.model_dump())
    success = serial_reader.connect(
        port=config.port,
        baud_rate=config.baud_rate,
        auto_reconnect=config.auto_reconnect
    )
    if not success:
        return {
            "status": "error",
            "state": serial_reader.status.state.value,
            "message": serial_reader.status.error_message or f"Could not connect to {config.port}."
        }
    return {
        "status": "connected",
        "state": serial_reader.status.state.value,
        "port": config.port,
        "baud_rate": config.baud_rate,
        "message": f"Serial connection initiated on {config.port} @ {config.baud_rate} baud."
    }

@app.post("/api/device/disconnect")
def disconnect_device():
    """Disconnects the ESP32 serial interface and stops reconnect attempts."""
    serial_reader.disconnect()
    return {
        "status": "disconnected",
        "state": serial_reader.status.state.value,
        "message": "ESP32 serial connection closed."
    }

@app.post("/api/device/calibrate")
def calibrate_device():
    """Sends calibration command to ESP32."""
    success = serial_reader.send_command({"cmd": "CALIBRATE"})
    return {
        "status": "transmitted" if success else "unconnected",
        "message": "Zero-offset calibration command dispatched to ESP32." if success else "Cannot calibrate: Serial port not open."
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

# --- Event History Endpoints ---

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


# --- WebSocket Stream ---

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # 1. Send current connection status to newly connected client
        await websocket.send_json({
            "type": "connection_status",
            "payload": serial_reader.status.model_dump()
        })

        # 2. If we have recent live hardware telemetry, send it
        if latest_hardware_telemetry is not None:
            await websocket.send_json({
                "type": "telemetry",
                "payload": latest_hardware_telemetry
            })

        while True:
            # Listen for client command packets from frontend
            data = await websocket.receive_text()
            try:
                import json
                payload = json.loads(data)
                cmd = payload.get("command")
                if cmd == "RESET_ALARM":
                    if latest_hardware_telemetry:
                        latest_hardware_telemetry["alarm"] = False
                        latest_hardware_telemetry["motion_alert"] = False
                        latest_hardware_telemetry["tilt_alert"] = False
                    serial_reader.send_command({"cmd": "RESET_ALARM"})
                    if latest_hardware_telemetry:
                        await ws_manager.broadcast({"type": "telemetry", "payload": latest_hardware_telemetry})
                elif cmd == "MANUAL_TEST":
                    if latest_hardware_telemetry:
                        latest_hardware_telemetry["alarm"] = True
                    serial_reader.send_command({"cmd": "MANUAL_TEST"})
                    if latest_hardware_telemetry:
                        await ws_manager.broadcast({"type": "telemetry", "payload": latest_hardware_telemetry})
            except Exception as parse_err:
                logger.error(f"Error handling WebSocket message: {parse_err}")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
