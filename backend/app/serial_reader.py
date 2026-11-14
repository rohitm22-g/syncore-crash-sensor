import os
import sys
import threading
import time
import json
import logging
from datetime import datetime
from typing import Optional, Callable, List, Dict, Any

try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False

from .models import ConnectionState, ConnectionStatus, TelemetryPayload

logger = logging.getLogger("syncore.serial")

LOCK_FILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "syncore_serial.lock"
)

class SerialPortLock:
    """
    Prevents multiple backend processes or workers from opening the same COM port.
    Uses an atomic lock file with the owner's PID.
    """
    @staticmethod
    def acquire(port: str) -> bool:
        pid = os.getpid()
        if os.path.exists(LOCK_FILE_PATH):
            try:
                with open(LOCK_FILE_PATH, "r") as f:
                    lock_data = json.load(f)
                locked_pid = lock_data.get("pid")
                locked_port = lock_data.get("port")
                
                # Check if process is still alive on Windows
                if locked_pid and locked_pid != pid:
                    import ctypes
                    kernel32 = ctypes.windll.kernel32
                    SYNCHRONIZE = 0x00100000
                    h_process = kernel32.OpenProcess(SYNCHRONIZE, False, locked_pid)
                    if h_process != 0:
                        kernel32.CloseHandle(h_process)
                        logger.warning(
                            f"Port {locked_port} is already locked by another active SYNCORE process (PID {locked_pid})."
                        )
                        return False
            except Exception as e:
                logger.debug(f"Stale lock inspect notice: {e}")

        try:
            with open(LOCK_FILE_PATH, "w") as f:
                json.dump({"pid": pid, "port": port, "time": datetime.utcnow().isoformat()}, f)
            return True
        except Exception as e:
            logger.error(f"Failed to create serial port lock: {e}")
            return False

    @staticmethod
    def release():
        try:
            if os.path.exists(LOCK_FILE_PATH):
                with open(LOCK_FILE_PATH, "r") as f:
                    lock_data = json.load(f)
                if lock_data.get("pid") == os.getpid():
                    os.remove(LOCK_FILE_PATH)
        except Exception as e:
            logger.debug(f"Error releasing lock file: {e}")


class SerialReader:
    def __init__(
        self,
        on_telemetry: Optional[Callable[[Dict[str, Any]], None]] = None,
        on_status_change: Optional[Callable[[ConnectionStatus], None]] = None
    ):
        self.port: str = "COM5"
        self.baud_rate: int = 115200
        self.auto_reconnect: bool = True
        
        self.serial_inst: Optional[Any] = None
        self.is_running: bool = False
        self.worker_thread: Optional[threading.Thread] = None
        
        self.on_telemetry = on_telemetry
        self.on_status_change = on_status_change
        
        self.status = ConnectionStatus(
            state=ConnectionState.DISCONNECTED,
            port=self.port,
            baud_rate=self.baud_rate
        )
        
        self._lock = threading.Lock()
        self.packets_received = 0
        self.invalid_packets = 0

    @staticmethod
    def list_ports() -> List[Dict[str, str]]:
        if not SERIAL_AVAILABLE:
            return [{"port": "COM5", "desc": "Virtual ESP32 Serial (PySerial Unavailable)"}]
        
        ports = serial.tools.list_ports.comports()
        result = []
        for p in ports:
            result.append({
                "port": p.device,
                "desc": p.description,
                "hwid": getattr(p, "hwid", "")
            })
        if not result:
            result.append({
                "port": "COM5",
                "desc": "Silicon Labs CP210x USB to UART Bridge (COM5)"
            })
        return result

    def set_state(self, state: ConnectionState, error_msg: Optional[str] = None):
        with self._lock:
            self.status.state = state
            self.status.port = self.port
            self.status.baud_rate = self.baud_rate
            self.status.error_message = error_msg
            self.status.packets_received = self.packets_received
            self.status.invalid_packets = self.invalid_packets
        
        logger.info(f"Serial state -> {state.value}" + (f": {error_msg}" if error_msg else ""))
        if self.on_status_change:
            try:
                self.on_status_change(self.status)
            except Exception as e:
                logger.error(f"Error in on_status_change callback: {e}")

    def connect(self, port: str = "COM5", baud_rate: int = 115200, auto_reconnect: bool = True) -> bool:
        if not SERIAL_AVAILABLE:
            self.set_state(ConnectionState.ERROR, "PySerial is not installed.")
            return False

        self.disconnect()

        self.port = port
        self.baud_rate = baud_rate
        self.auto_reconnect = auto_reconnect

        # Prevent multiple backend processes from opening the same COM port
        if not SerialPortLock.acquire(self.port):
            err = f"Port {self.port} is already in use by another SYNCORE backend process."
            self.set_state(ConnectionState.ERROR, err)
            return False

        self.is_running = True
        self.worker_thread = threading.Thread(target=self._run_worker, daemon=True)
        self.worker_thread.start()
        return True

    def disconnect(self):
        self.is_running = False
        self.auto_reconnect = False
        
        if self.serial_inst:
            try:
                self.serial_inst.close()
            except Exception as e:
                logger.debug(f"Error closing serial instance: {e}")
            self.serial_inst = None

        if self.worker_thread and self.worker_thread.is_alive():
            self.worker_thread.join(timeout=1.5)
            self.worker_thread = None

        SerialPortLock.release()
        self.set_state(ConnectionState.DISCONNECTED, None)

    def send_command(self, cmd_dict: Dict[str, Any]) -> bool:
        if not self.serial_inst or not self.serial_inst.is_open:
            logger.warning("Cannot write command: Serial port is not open.")
            return False
        try:
            line = json.dumps(cmd_dict) + "\n"
            self.serial_inst.write(line.encode("utf-8"))
            self.serial_inst.flush()
            logger.info(f"Command transmitted to ESP32: {line.strip()}")
            return True
        except Exception as e:
            logger.error(f"Failed to transmit command: {e}")
            return False

    def _open_port(self) -> bool:
        try:
            self.serial_inst = serial.Serial(
                port=self.port,
                baudrate=self.baud_rate,
                timeout=1.0,
                write_timeout=1.0
            )
            # Clear input buffer
            self.serial_inst.reset_input_buffer()
            self.set_state(ConnectionState.CONNECTED, None)
            logger.info(f"Successfully opened {self.port} at {self.baud_rate} baud.")
            return True
        except serial.SerialException as se:
            err_msg = str(se)
            if "PermissionError" in err_msg or "Access is denied" in err_msg:
                user_msg = (
                    f"Access to {self.port} denied. The port is currently open in another program "
                    "(such as Arduino IDE Serial Monitor or VS Code). Close the Serial Monitor to allow connection."
                )
            elif "FileNotFoundError" in err_msg or "could not open port" in err_msg:
                user_msg = f"{self.port} not found. Ensure your ESP32 is plugged into USB."
            else:
                user_msg = f"Serial error on {self.port}: {err_msg}"
            
            self.set_state(ConnectionState.ERROR, user_msg)
            self.serial_inst = None
            return False
        except Exception as e:
            self.set_state(ConnectionState.ERROR, f"Unexpected error opening {self.port}: {e}")
            self.serial_inst = None
            return False

    def _run_worker(self):
        """
        Background worker that maintains the serial connection, reads lines,
        validates JSON against TelemetryPayload, and handles graceful reconnection.
        """
        while self.is_running:
            if not self.serial_inst or not self.serial_inst.is_open:
                success = self._open_port()
                if not success:
                    if not self.auto_reconnect or not self.is_running:
                        break
                    # Wait before attempting reconnection
                    time.sleep(2.0)
                    continue

            # Port is open, read lines
            try:
                raw_bytes = self.serial_inst.readline()
                if not raw_bytes:
                    continue

                line = raw_bytes.decode("utf-8", errors="replace").strip()
                if not line:
                    continue

                # Must look like JSON object
                if not (line.startswith("{") and line.endswith("}")):
                    logger.debug(f"[ESP32 Non-JSON output]: {line}")
                    continue

                # Parse JSON
                try:
                    raw_data = json.loads(line)
                except json.JSONDecodeError as jde:
                    self.invalid_packets += 1
                    logger.warning(f"Malformed JSON from ESP32: {line} ({jde})")
                    continue

                # Validate expected fields and data types strictly
                try:
                    payload = TelemetryPayload.model_validate(raw_data)
                    validated_dict = payload.model_dump()
                    
                    self.packets_received += 1
                    with self._lock:
                        self.status.last_packet_time = datetime.utcnow().isoformat()
                        self.status.packets_received = self.packets_received
                    
                    if self.on_telemetry:
                        self.on_telemetry(validated_dict)

                except Exception as val_err:
                    self.invalid_packets += 1
                    with self._lock:
                        self.status.invalid_packets = self.invalid_packets
                    logger.warning(f"ESP32 data schema validation failed: {val_err} | Raw: {raw_data}")

            except (serial.SerialException, OSError) as read_err:
                logger.error(f"Serial connection interrupted on {self.port}: {read_err}")
                self.set_state(ConnectionState.DISCONNECTED, f"Connection lost: {read_err}")
                if self.serial_inst:
                    try:
                        self.serial_inst.close()
                    except Exception:
                        pass
                    self.serial_inst = None

                if not self.auto_reconnect or not self.is_running:
                    break
                time.sleep(2.0)

            except Exception as e:
                logger.error(f"Unexpected exception in serial worker: {e}")
                time.sleep(0.5)

        # Cleanup on exit
        if self.serial_inst:
            try:
                self.serial_inst.close()
            except Exception:
                pass
            self.serial_inst = None
        SerialPortLock.release()
        if self.status.state == ConnectionState.CONNECTED:
            self.set_state(ConnectionState.DISCONNECTED, "Worker stopped.")

serial_reader = SerialReader()
