/*
 * ============================================================================
 * SYNCORE — Intelligent Crash Detection & Monitoring System
 * Hardware Target: ESP32-WROOM-32 + MPU6050 (6-DoF I2C Accelerometer/Gyroscope)
 * 
 * Hardware Wiring:
 *   ESP32 3.3V  -> MPU6050 VCC
 *   ESP32 GND   -> MPU6050 GND
 *   ESP32 GPIO21 (SDA) -> MPU6050 SDA
 *   ESP32 GPIO22 (SCL) -> MPU6050 SCL
 *   ESP32 GPIO2  -> On-board Status LED / Alarm Buzzer (Optional)
 * ============================================================================
 */

#include <Wire.h>

#define MPU6050_ADDR 0x68
#define ALARM_PIN    2

// Raw MPU6050 registers
int16_t raw_ax, raw_ay, raw_az;
int16_t raw_gx, raw_gy, raw_gz;

// Zero-offset calibration
float ax_offset = 0.0, ay_offset = 0.0, az_offset = 0.0;
float gx_offset = 0.0, gy_offset = 0.0, gz_offset = 0.0;

// Filtered orientation angles
float roll = 0.0;
float pitch = 0.0;

// Detection thresholds
float linearAccelThreshold = 2.5; // in G
float tiltThreshold = 45.0;        // in degrees
float gyroThreshold = 200.0;       // in deg/s

// Alarm state flags
bool motion_alert = false;
bool tilt_alert = false;
bool alarm = false;
String system_status = "MONITORING";

unsigned long lastSampleTime = 0;
const unsigned long sampleInterval = 100; // 10Hz JSON telemetry output

void setupMPU6050() {
  Wire.begin(21, 22);
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1
  Wire.write(0x00); // Wake up MPU6050
  Wire.endTransmission(true);

  // Set Accelerometer range to +/- 4G (0x08)
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x1C);
  Wire.write(0x08);
  Wire.endTransmission(true);

  // Set Gyroscope range to +/- 500 deg/s (0x08)
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x1B);
  Wire.write(0x08);
  Wire.endTransmission(true);
}

void calibrateSensors() {
  long sum_ax = 0, sum_ay = 0, sum_az = 0;
  long sum_gx = 0, sum_gy = 0, sum_gz = 0;
  const int samples = 200;

  for (int i = 0; i < samples; i++) {
    readRawSensors();
    sum_ax += raw_ax;
    sum_ay += raw_ay;
    sum_az += raw_az;
    sum_gx += raw_gx;
    sum_gy += raw_gy;
    sum_gz += raw_gz;
    delay(5);
  }

  ax_offset = (float)sum_ax / samples / 8192.0;
  ay_offset = (float)sum_ay / samples / 8192.0;
  az_offset = ((float)sum_az / samples / 8192.0) - 1.0; // Subtract 1G static gravity
  gx_offset = (float)sum_gx / samples / 65.5;
  gy_offset = (float)sum_gy / samples / 65.5;
  gz_offset = (float)sum_gz / samples / 65.5;
}

void readRawSensors() {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU6050_ADDR, 14, true);

  raw_ax = Wire.read() << 8 | Wire.read();
  raw_ay = Wire.read() << 8 | Wire.read();
  raw_az = Wire.read() << 8 | Wire.read();
  Wire.read(); Wire.read(); // Skip temp
  raw_gx = Wire.read() << 8 | Wire.read();
  raw_gy = Wire.read() << 8 | Wire.read();
  raw_gz = Wire.read() << 8 | Wire.read();
}

void processSerialCommands() {
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.indexOf("RESET_ALARM") >= 0) {
      alarm = false;
      motion_alert = false;
      tilt_alert = false;
      digitalWrite(ALARM_PIN, LOW);
    } else if (input.indexOf("MANUAL_TEST") >= 0) {
      alarm = true;
      digitalWrite(ALARM_PIN, HIGH);
    } else if (input.indexOf("CALIBRATE") >= 0) {
      calibrateSensors();
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(ALARM_PIN, OUTPUT);
  digitalWrite(ALARM_PIN, LOW);

  setupMPU6050();
  calibrateSensors();
}

void loop() {
  processSerialCommands();

  unsigned long currentMillis = millis();
  if (currentMillis - lastSampleTime >= sampleInterval) {
    float dt = (currentMillis - lastSampleTime) / 1000.0;
    lastSampleTime = currentMillis;

    readRawSensors();

    // Convert raw readings to engineering units
    float ax = ((float)raw_ax / 8192.0) - ax_offset;
    float ay = ((float)raw_ay / 8192.0) - ay_offset;
    float az = ((float)raw_az / 8192.0) - az_offset;

    float gx = ((float)raw_gx / 65.5) - gx_offset;
    float gy = ((float)raw_gy / 65.5) - gy_offset;
    float gz = ((float)raw_gz / 65.5) - gz_offset;

    // Linear dynamic acceleration magnitude (without static 1G gravity)
    float linX = ax;
    float linY = ay;
    float linZ = az - 1.0;
    float linear_accel = sqrt(linX * linX + linY * linY + linZ * linZ);

    // Total angular velocity magnitude
    float gyro = sqrt(gx * gx + gy * gy + gz * gz);

    // Complementary Filter for Roll and Pitch estimation
    float roll_acc = atan2(ay, az) * 180.0 / PI;
    float pitch_acc = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0 / PI;

    roll = 0.96 * (roll + gx * dt) + 0.04 * roll_acc;
    pitch = 0.96 * (pitch + gy * dt) + 0.04 * pitch_acc;

    // Anomaly & Crash Detection Logic
    if (system_status == "MONITORING") {
      if (linear_accel > linearAccelThreshold) {
        motion_alert = true;
      }
      if (abs(roll) > tiltThreshold) {
        tilt_alert = true;
        alarm = true; // Sideways rollover triggers persistent alarm
      }
      if (linear_accel > (linearAccelThreshold * 1.5) && abs(roll) > 30.0) {
        alarm = true; // Combined high-impact + rollover
      }
    }

    if (alarm) {
      digitalWrite(ALARM_PIN, HIGH);
    }

    // Output formatted JSON telemetry strictly matching the SYNCORE data contract
    Serial.print("{\"linear_accel\":");
    Serial.print(linear_accel, 2);
    Serial.print(",\"gyro\":");
    Serial.print(gyro, 1);
    Serial.print(",\"roll\":");
    Serial.print(roll, 1);
    Serial.print(",\"pitch\":");
    Serial.print(pitch, 1);
    Serial.print(",\"tilt_alert\":");
    Serial.print(tilt_alert ? "true" : "false");
    Serial.print(",\"motion_alert\":");
    Serial.print(motion_alert ? "true" : "false");
    Serial.print(",\"alarm\":");
    Serial.print(alarm ? "true" : "false");
    Serial.print(",\"status\":\"");
    Serial.print(system_status);
    Serial.print("\",\"ax\":");
    Serial.print(ax, 2);
    Serial.print(",\"ay\":");
    Serial.print(ay, 2);
    Serial.print(",\"az\":");
    Serial.print(az, 2);
    Serial.print(",\"gx\":");
    Serial.print(gx, 1);
    Serial.print(",\"gy\":");
    Serial.print(gy, 1);
    Serial.print(",\"gz\":");
    Serial.print(gz, 1);
    Serial.println("}");
  }
}
