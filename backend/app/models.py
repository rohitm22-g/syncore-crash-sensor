from pydantic import BaseModel, Field
from typing import Optional

class TelemetryPayload(BaseModel):
    linear_accel: float = Field(..., description="Linear acceleration magnitude in G")
    gyro: float = Field(..., description="Angular velocity magnitude in deg/s")
    roll: float = Field(..., description="Roll angle in degrees")
    pitch: float = Field(..., description="Pitch angle in degrees")
    tilt_alert: bool = Field(default=False)
    motion_alert: bool = Field(default=False)
    alarm: bool = Field(default=False)
    status: str = Field(default="MONITORING")
    
    # Extended 6-DoF sensor values
    ax: Optional[float] = 0.0
    ay: Optional[float] = 0.0
    az: Optional[float] = 1.0
    gx: Optional[float] = 0.0
    gy: Optional[float] = 0.0
    gz: Optional[float] = 0.0
    timestamp: Optional[str] = None
    is_simulated: Optional[bool] = False

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
    port: str = "COM4"
    baud_rate: int = 115200

class ThresholdConfig(BaseModel):
    linearAccelThreshold: float = 2.5
    tiltThreshold: float = 45.0
    gyroThreshold: float = 200.0
