/**
 * SYNCORE Simulation Service
 * Generates realistic MPU6050 accelerometer & gyroscope telemetry.
 * Educational / prototype simulation for crash detection validation.
 */

class SimulationService {
  constructor() {
    this.status = 'MONITORING'; // MONITORING, STANDBY, PAUSED
    this.alarm = false;
    this.motion_alert = false;
    this.tilt_alert = false;
    this.activeScenario = 'normal'; // 'normal', 'spike', 'tilt', 'crash', 'braking'
    this.scenarioTicksRemaining = 0;
    this.isCalibrated = true;

    // Baseline kinematics
    this.currentRoll = 0.5;
    this.currentPitch = 1.2;
    this.baseLinearAccel = 0.12;
    this.baseGyro = 3.5;

    // Thresholds
    this.thresholds = {
      linearAccelThreshold: 2.5, // in G
      tiltThreshold: 45.0, // in degrees
      gyroThreshold: 200.0 // in deg/s
    };

    this.tickCount = 0;
  }

  setThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  setStatus(status) {
    this.status = status;
  }

  resetAlarm() {
    this.alarm = false;
    this.motion_alert = false;
    this.tilt_alert = false;
    this.activeScenario = 'normal';
    this.scenarioTicksRemaining = 0;
    this.currentRoll = (Math.random() - 0.5) * 2;
    this.currentPitch = (Math.random() - 0.5) * 2;
    return {
      type: 'DETECTOR_RESET',
      category: 'System Reset',
      message: 'Alarm reset by operator. Sensor monitoring restored to baseline.',
      timestamp: new Date().toISOString()
    };
  }

  triggerManualAlarmTest() {
    this.alarm = true;
    return {
      type: 'MANUAL_TEST',
      category: 'Alarm Test',
      message: 'Operator initiated manual audio/visual alarm test sequence.',
      timestamp: new Date().toISOString(),
      linear_accel: Number(this.baseLinearAccel.toFixed(2)),
      gyro: Number(this.baseGyro.toFixed(1)),
      roll: Number(this.currentRoll.toFixed(1)),
      pitch: Number(this.currentPitch.toFixed(1)),
      alarm: true
    };
  }

  triggerScenario(scenarioName) {
    this.activeScenario = scenarioName;
    if (scenarioName === 'spike') {
      this.scenarioTicksRemaining = 12; // ~1.2s spike
    } else if (scenarioName === 'tilt') {
      this.scenarioTicksRemaining = 25; // sustained sideways roll
    } else if (scenarioName === 'crash') {
      this.scenarioTicksRemaining = 35; // violent impact + rollover
    } else if (scenarioName === 'braking') {
      this.scenarioTicksRemaining = 15;
    }
  }

  calibrateSensor() {
    this.isCalibrated = false;
    return new Promise((resolve) => {
      setTimeout(() => {
        this.currentRoll = 0.0;
        this.currentPitch = 0.0;
        this.isCalibrated = true;
        resolve({
          success: true,
          message: 'MPU6050 accelerometer & gyroscope zero-offsets calibrated successfully.'
        });
      }, 1500);
    });
  }

  getNextTelemetry() {
    this.tickCount++;

    let ax = (Math.random() - 0.5) * 0.08;
    let ay = (Math.random() - 0.5) * 0.08;
    let az = 1.0 + (Math.random() - 0.5) * 0.05; // 1G static gravity

    let gx = (Math.random() - 0.5) * 4.0;
    let gy = (Math.random() - 0.5) * 4.0;
    let gz = (Math.random() - 0.5) * 3.0;

    let targetRoll = Math.sin(this.tickCount * 0.05) * 2.5;
    let targetPitch = Math.cos(this.tickCount * 0.04) * 1.8;

    let detectedEvent = null;

    if (this.activeScenario === 'spike') {
      // Sudden high linear acceleration
      const progress = (12 - this.scenarioTicksRemaining) / 12;
      const spikeFactor = Math.sin(progress * Math.PI) * 3.6;
      ax += spikeFactor * 0.8;
      ay += spikeFactor * 0.5;
      az += spikeFactor * 0.3;
      gx += (Math.random() - 0.5) * 70;
      gy += (Math.random() - 0.5) * 60;

      this.motion_alert = true;
      if (this.scenarioTicksRemaining === 11) {
        detectedEvent = {
          type: 'SUDDEN_MOVEMENT',
          category: 'Sudden Movement',
          severity: 'warning',
          message: 'High dynamic acceleration spike detected on horizontal axes.',
          timestamp: new Date().toISOString()
        };
      }

      this.scenarioTicksRemaining--;
      if (this.scenarioTicksRemaining <= 0) {
        this.activeScenario = 'normal';
      }
    } else if (this.activeScenario === 'tilt') {
      // Excessive sideways tilt / roll
      const progress = (25 - this.scenarioTicksRemaining) / 25;
      targetRoll = 25 + Math.sin(progress * Math.PI) * 32; // Peaks at ~57° roll
      ay += 0.45;
      gy += 25.0;

      if (targetRoll > this.thresholds.tiltThreshold) {
        this.tilt_alert = true;
        if (!this.alarm) {
          this.alarm = true;
          detectedEvent = {
            type: 'EXCESSIVE_TILT',
            category: 'Excessive Tilt',
            severity: 'alarm',
            message: `Sideways tilt angle (${targetRoll.toFixed(1)}°) exceeded threshold (${this.thresholds.tiltThreshold}°). Potential rollover event.`,
            timestamp: new Date().toISOString()
          };
        }
      }

      this.scenarioTicksRemaining--;
      if (this.scenarioTicksRemaining <= 0) {
        this.activeScenario = 'normal';
      }
    } else if (this.activeScenario === 'crash') {
      // Severe simulated crash: high G impact followed by roll
      const progress = (35 - this.scenarioTicksRemaining) / 35;
      if (progress < 0.4) {
        // Impact phase
        const impactFactor = Math.sin((progress / 0.4) * Math.PI) * 5.2;
        ax += impactFactor * 1.2;
        ay += impactFactor * 0.9;
        az += impactFactor * 0.7;
        gx += (Math.random() - 0.5) * 340;
        gy += (Math.random() - 0.5) * 280;
        targetRoll = 40 + Math.random() * 25;
      } else {
        // Post-impact rollover / resting angle
        targetRoll = 52.0;
        targetPitch = 14.0;
      }

      this.motion_alert = true;
      this.tilt_alert = true;
      this.alarm = true;

      if (this.scenarioTicksRemaining === 34) {
        detectedEvent = {
          type: 'CRASH_IMPACT',
          category: 'Impact Trigger',
          severity: 'critical',
          message: 'Violent multi-axis acceleration spike & rotational shear detected. Emergency alarm triggered.',
          timestamp: new Date().toISOString()
        };
      }

      this.scenarioTicksRemaining--;
      if (this.scenarioTicksRemaining <= 0) {
        // Remain in alarm state until manually reset
        this.activeScenario = 'post_crash';
      }
    } else if (this.activeScenario === 'braking') {
      const progress = (15 - this.scenarioTicksRemaining) / 15;
      const brakingFactor = Math.sin(progress * Math.PI) * 1.8;
      ax += brakingFactor;
      targetPitch -= brakingFactor * 3.5;
      this.scenarioTicksRemaining--;
      if (this.scenarioTicksRemaining <= 0) {
        this.activeScenario = 'normal';
      }
    } else {
      // Normal monitoring
      if (!this.alarm) {
        this.motion_alert = false;
        this.tilt_alert = false;
      }
    }

    // Smooth roll and pitch transition
    this.currentRoll += (targetRoll - this.currentRoll) * 0.15;
    this.currentPitch += (targetPitch - this.currentPitch) * 0.15;

    // Linear acceleration magnitude (dynamic acceleration without static 1G gravity)
    const linX = ax;
    const linY = ay;
    const linZ = az - 1.0;
    const linearAccelMagnitude = Math.sqrt(linX * linX + linY * linY + linZ * linZ);

    // Total gyro magnitude
    const gyroMagnitude = Math.sqrt(gx * gx + gy * gy + gz * gz);

    // Check thresholds in monitoring state
    if (this.status === 'MONITORING') {
      if (linearAccelMagnitude > this.thresholds.linearAccelThreshold && !this.motion_alert) {
        this.motion_alert = true;
        if (!detectedEvent) {
          detectedEvent = {
            type: 'SUDDEN_MOVEMENT',
            category: 'Sudden Movement',
            severity: 'warning',
            message: `Linear acceleration (${linearAccelMagnitude.toFixed(2)} G) crossed warning threshold (${this.thresholds.linearAccelThreshold} G).`,
            timestamp: new Date().toISOString()
          };
        }
      }

      if (Math.abs(this.currentRoll) > this.thresholds.tiltThreshold && !this.tilt_alert) {
        this.tilt_alert = true;
        this.alarm = true;
        if (!detectedEvent) {
          detectedEvent = {
            type: 'EXCESSIVE_TILT',
            category: 'Excessive Tilt',
            severity: 'alarm',
            message: `Sideways tilt angle (${Math.abs(this.currentRoll).toFixed(1)}°) exceeded threshold (${this.thresholds.tiltThreshold}°).`,
            timestamp: new Date().toISOString()
          };
        }
      }
    }

    // Formulate payload strictly compatible with the hardware data format
    const telemetry = {
      // Primary hardware contract fields
      linear_accel: Number(linearAccelMagnitude.toFixed(2)),
      gyro: Number(gyroMagnitude.toFixed(1)),
      roll: Number(this.currentRoll.toFixed(1)),
      pitch: Number(this.currentPitch.toFixed(1)),
      tilt_alert: this.tilt_alert,
      motion_alert: this.motion_alert,
      alarm: this.alarm,
      status: this.status,

      // High-resolution sensor breakdown for advanced monitoring
      ax: Number(ax.toFixed(2)),
      ay: Number(ay.toFixed(2)),
      az: Number(az.toFixed(2)),
      gx: Number(gx.toFixed(1)),
      gy: Number(gy.toFixed(1)),
      gz: Number(gz.toFixed(1)),
      timestamp: new Date().toISOString(),
      is_simulated: true
    };

    if (detectedEvent) {
      detectedEvent.linear_accel = telemetry.linear_accel;
      detectedEvent.gyro = telemetry.gyro;
      detectedEvent.roll = telemetry.roll;
      detectedEvent.pitch = telemetry.pitch;
      detectedEvent.alarm = telemetry.alarm;
    }

    return { telemetry, detectedEvent };
  }
}

export const simulationService = new SimulationService();
