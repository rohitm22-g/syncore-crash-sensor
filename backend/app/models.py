from pydantic import BaseModel, Field, field_validator
from typing import Optional, Any
from enum import Enum

class ConnectionState(str, Enum):
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"
    ERROR = "ERROR"

class TelemetryPayload(BaseModel):
    """
    ESP32 Hardware Telemetry Contract.
    Must strictly match the hardware JSON schema sent by the ESP32.
    """
    linear_accel: float = Field(..., description="Linear dynamic acceleration magnitude in G")
    gyro: float = Field(..., description="Total angular velocity magnitude in deg/s")
    roll: float = Field(..., description="Roll angle in degrees")
    pitch: float = Field(..., description="Pitch angle in degrees")
    tilt_alert: bool = Field(..., description="True if sideways tilt exceeded threshold")
    motion_alert: bool = Field(..., description="True if sudden acceleration spike detected")
    alarm: bool = Field(..., description="True if alarm state is active")
    status: str = Field(default="MONITORING", description="Current detector status, e.g. MONITORING")

    # Optional 6-DoF raw/derived fields if emitted by extended firmware
    ax: Optional[float] = None
    ay: Optional[float] = None
    az: Optional[float] = None
    gx: Optional[float] = None
    gy: Optional[float] = None
    gz: Optional[float] = None
    timestamp: Optional[str] = None
    is_simulated: Optional[bool] = False

    @field_validator("linear_accel", "gyro", "roll", "pitch", mode="before")
    @classmethod
    def validate_numeric(cls, v: Any) -> float:
        if isinstance(v, (int, float)):
            return float(v)
        try:
            return float(v)
        except (ValueError, TypeError):
            raise ValueError(f"Expected numeric value, got {type(v).__name__}: {v}")

    @field_validator("tilt_alert", "motion_alert", "alarm", mode="before")
    @classmethod
    def validate_bool(cls, v: Any) -> bool:
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            if v.lower() in ("true", "1", "yes"):
                return True
            if v.lower() in ("false", "0", "no"):
                return False
        if isinstance(v, (int, float)):
            return bool(v)
        raise ValueError(f"Expected boolean value, got {type(v).__name__}: {v}")

class EventRecord(BaseModel):
    id: Optional[str] = None
    type: str
    category: str
    severity: Optional[str] = "normal"
    message: str
    linear_accel: Optional[float] = None
    gyro: Optional[float] = None
    roll: Optional[float] = None
    pitch: Optional[float] = None
    alarm: Optional[bool] = False
    timestamp: Optional[str] = None

class SerialConfig(BaseModel):
    port: str = "COM5"
    baud_rate: int = 115200
    auto_reconnect: bool = True

class ConnectionStatus(BaseModel):
    state: ConnectionState
    port: Optional[str] = None
    baud_rate: int = 115200
    error_message: Optional[str] = None
    packets_received: int = 0
    invalid_packets: int = 0
    last_packet_time: Optional[str] = None

class ThresholdConfig(BaseModel):
    linearAccelThreshold: float = 2.5
    tiltThreshold: float = 45.0
    gyroThreshold: float = 200.0
