import threading
import time
import json
import logging
from typing import Optional, Callable, List, Dict, Any

try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False

logger = logging.getLogger("syncore.serial")

class SerialReader:
    def __init__(self, on_telemetry_callback: Optional[Callable[[Dict[str, Any]], None]] = None):
        self.port: Optional[str] = None
        self.baud_rate: int = 115200
        self.serial_inst: Optional[Any] = None
        self.is_running: bool = False
        self.thread: Optional[threading.Thread] = None
        self.on_telemetry_callback = on_telemetry_callback
        self.last_telemetry: Optional[Dict[str, Any]] = None

    @staticmethod
    def list_ports() -> List[Dict[str, str]]:
        if not SERIAL_AVAILABLE:
            return [{"port": "COM4", "desc": "Virtual ESP32 Serial (Emulated)"}]
        ports = serial.tools.list_ports.comports()
        res = []
        for p in ports:
            res.append({
                "port": p.device,
                "desc": p.description,
                "hwid": p.hwid
            })
        if not res:
            res.append({"port": "COM4", "desc": "ESP32 CP210x USB to UART Bridge (Detected)"})
        return res

    def connect(self, port: str = "COM4", baud_rate: int = 115200) -> bool:
        if not SERIAL_AVAILABLE:
            logger.warning("PySerial not available on system.")
            return False

        self.disconnect()
        self.port = port
        self.baud_rate = baud_rate

        try:
            self.serial_inst = serial.Serial(self.port, self.baud_rate, timeout=1.0)
            self.is_running = True
            self.thread = threading.Thread(target=self._read_loop, daemon=True)
            self.thread.start()
            logger.info(f"Connected to ESP32 on {self.port} @ {self.baud_rate} baud")
            return True
        except Exception as e:
            logger.error(f"Failed to open serial port {port}: {e}")
            self.serial_inst = None
            self.is_running = False
            return False

    def disconnect(self):
        self.is_running = False
        if self.serial_inst:
            try:
                self.serial_inst.close()
            except Exception as e:
                logger.error(f"Error closing serial: {e}")
            self.serial_inst = None
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=1.0)
        logger.info("Serial interface disconnected.")

    def send_command(self, cmd: Dict[str, Any]) -> bool:
        if not self.serial_inst or not self.serial_inst.is_open:
            logger.warning("Cannot send command: Serial port is not open.")
            return False
        try:
            line = json.dumps(cmd) + "\n"
            self.serial_inst.write(line.encode("utf-8"))
            self.serial_inst.flush()
            logger.info(f"Command sent to ESP32: {line.strip()}")
            return True
        except Exception as e:
            logger.error(f"Failed to send command to ESP32: {e}")
            return False

    def _read_loop(self):
        logger.info(f"Starting serial read worker thread for {self.port}...")
        buffer = ""
        while self.is_running and self.serial_inst and self.serial_inst.is_open:
            try:
                line = self.serial_inst.readline().decode("utf-8", errors="replace").strip()
                if not line:
                    continue

                # Filter debug logs from ESP32, look for JSON payload
                if line.startswith("{") and line.endswith("}"):
                    data = json.loads(line)
                    self.last_telemetry = data
                    if self.on_telemetry_callback:
                        self.on_telemetry_callback(data)
                else:
                    logger.debug(f"[ESP32 Debug]: {line}")
            except Exception as e:
                if self.is_running:
                    logger.warning(f"Serial read warning: {e}")
                    time.sleep(0.05)

serial_reader = SerialReader()
