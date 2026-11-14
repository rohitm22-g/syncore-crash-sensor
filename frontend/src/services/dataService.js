/**
 * SYNCORE Data Service
 * Decoupled data-service abstraction layer.
 * Switches seamlessly between Simulated DEMO MODE and Live WebSocket backend telemetry.
 */

import { simulationService } from './simulationService';

class DataService {
  constructor() {
    this.source = 'DEMO'; // 'DEMO' or 'LIVE'
    this.connectionState = 'connected'; // 'connected', 'connecting', 'disconnected', 'error', 'demo'
    this.hardwareStatus = {
      state: 'DISCONNECTED',
      port: 'COM5',
      baud_rate: 115200,
      error_message: null,
      packets_received: 0,
      invalid_packets: 0
    };

    this.telemetrySubscribers = new Set();
    this.eventSubscribers = new Set();
    this.connectionSubscribers = new Set();

    this.timerId = null;
    this.updateIntervalMs = 100; // 10Hz telemetry rate
    this.socket = null;

    // Buffer of recent sensor readings for charting (past 40 samples)
    this.maxChartPoints = 40;
    this.telemetryBuffer = [];

    // Local event history (stored with persistent fallback)
    this.eventHistory = this.loadInitialEvents();

    // Latest telemetry cache matching hardware structure
    this.latestTelemetry = {
      linear_accel: 0.12,
      gyro: 2.4,
      roll: 0.0,
      pitch: 0.0,
      tilt_alert: false,
      motion_alert: false,
      alarm: false,
      status: 'MONITORING',
      ax: 0.0,
      ay: 0.0,
      az: 1.0,
      gx: 0.0,
      gy: 0.0,
      gz: 0.0,
      timestamp: new Date().toISOString(),
      is_simulated: true
    };

    // Auto-start in DEMO mode initially as specified in requirements
    this.startSimulation();
  }

  loadInitialEvents() {
    try {
      const saved = localStorage.getItem('syncore_event_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore storage errors
    }

    return [
      {
        id: 'EVT-1001',
        type: 'SYSTEM_BOOT',
        category: 'System Initialization',
        severity: 'normal',
        message: 'SYNCORE Crash Detection Kernel initialized. MPU6050 calibrated.',
        linear_accel: 0.05,
        gyro: 1.2,
        roll: 0.2,
        pitch: -0.1,
        alarm: false,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
      },
      {
        id: 'EVT-1002',
        type: 'MANUAL_TEST',
        category: 'Alarm Test',
        severity: 'warning',
        message: 'Pre-flight acoustic and optical alarm test passed.',
        linear_accel: 0.14,
        gyro: 3.1,
        roll: 0.4,
        pitch: 0.2,
        alarm: true,
        timestamp: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'EVT-1003',
        type: 'DETECTOR_RESET',
        category: 'System Reset',
        severity: 'normal',
        message: 'Alarm reset by operator. Sensor monitoring restored.',
        linear_accel: 0.11,
        gyro: 2.0,
        roll: 0.1,
        pitch: 0.0,
        alarm: false,
        timestamp: new Date(Date.now() - 3550000).toISOString()
      }
    ];
  }

  saveEvents() {
    try {
      localStorage.setItem('syncore_event_history', JSON.stringify(this.eventHistory));
    } catch {
      // Ignore
    }
  }

  // --- Subscriptions ---
  subscribeTelemetry(callback) {
    this.telemetrySubscribers.add(callback);
    if (this.latestTelemetry) {
      callback(this.latestTelemetry, this.telemetryBuffer);
    }
    return () => this.telemetrySubscribers.delete(callback);
  }

  subscribeEvent(callback) {
    this.eventSubscribers.add(callback);
    return () => this.eventSubscribers.delete(callback);
  }

  subscribeConnection(callback) {
    this.connectionSubscribers.add(callback);
    callback({
      source: this.source,
      state: this.source === 'DEMO' ? 'demo' : this.connectionState,
      hardwareStatus: this.hardwareStatus
    });
    return () => this.connectionSubscribers.delete(callback);
  }

  notifyConnection() {
    const payload = {
      source: this.source,
      state: this.source === 'DEMO' ? 'demo' : this.connectionState,
      hardwareStatus: this.hardwareStatus
    };
    this.connectionSubscribers.forEach((cb) => cb(payload));
  }

  // --- Mode Switching ---
  setDataSource(newSource) {
    if (this.source === newSource) return;
    this.source = newSource;

    if (newSource === 'DEMO') {
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      this.startSimulation();
    } else {
      this.stopSimulation();
      // Reset live telemetry baseline without generating fake motion
      this.latestTelemetry = {
        ...this.latestTelemetry,
        status: 'STANDBY',
        is_simulated: false
      };
      this.connectWebSocket();
    }
    this.notifyConnection();
  }

  startSimulation() {
    this.stopSimulation();
    this.timerId = setInterval(() => {
      const { telemetry, detectedEvent } = simulationService.getNextTelemetry();
      this.handleIncomingTelemetry(telemetry);

      if (detectedEvent) {
        this.recordEvent(detectedEvent);
      }
    }, this.updateIntervalMs);
  }

  stopSimulation() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  // --- Data processing ---
  handleIncomingTelemetry(telemetry) {
    this.latestTelemetry = telemetry;

    const timeLabel = new Date(telemetry.timestamp || Date.now()).toLocaleTimeString([], {
      hour12: false,
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 1
    });

    const point = {
      time: timeLabel,
      linear_accel: telemetry.linear_accel,
      gyro: telemetry.gyro,
      roll: telemetry.roll,
      pitch: telemetry.pitch,
      ax: telemetry.ax ?? 0,
      ay: telemetry.ay ?? 0,
      az: telemetry.az ?? 1,
      gx: telemetry.gx ?? 0,
      gy: telemetry.gy ?? 0,
      gz: telemetry.gz ?? 0
    };

    this.telemetryBuffer.push(point);
    if (this.telemetryBuffer.length > this.maxChartPoints) {
      this.telemetryBuffer.shift();
    }

    this.telemetrySubscribers.forEach((cb) => {
      try {
        cb(this.latestTelemetry, [...this.telemetryBuffer]);
      } catch (err) {
        console.error('Telemetry subscriber error:', err);
      }
    });
  }

  recordEvent(evt) {
    const newEvent = {
      id: evt.id || `EVT-${Date.now().toString().slice(-4)}`,
      ...evt,
      timestamp: evt.timestamp || new Date().toISOString()
    };

    this.eventHistory = [newEvent, ...this.eventHistory];
    if (this.eventHistory.length > 500) {
      this.eventHistory.pop();
    }
    this.saveEvents();

    this.eventSubscribers.forEach((cb) => {
      try {
        cb(newEvent, this.eventHistory);
      } catch (err) {
        console.error('Event subscriber error:', err);
      }
    });

    if (this.source === 'LIVE') {
      this.syncEventToBackend(newEvent);
    }
  }

  async syncEventToBackend(evt) {
    try {
      await fetch('http://localhost:8000/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evt)
      });
    } catch {
      // Backend might be offline
    }
  }

  // --- Actions ---
  resetAlarm() {
    if (this.source === 'DEMO') {
      const resetEvt = simulationService.resetAlarm();
      this.recordEvent(resetEvt);
      this.latestTelemetry.alarm = false;
      this.latestTelemetry.motion_alert = false;
      this.latestTelemetry.tilt_alert = false;
      this.handleIncomingTelemetry(this.latestTelemetry);
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ command: 'RESET_ALARM' }));
    }
  }

  triggerManualAlarmTest() {
    if (this.source === 'DEMO') {
      const testEvt = simulationService.triggerManualAlarmTest();
      this.recordEvent(testEvt);
      this.latestTelemetry.alarm = true;
      this.handleIncomingTelemetry(this.latestTelemetry);
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ command: 'MANUAL_TEST' }));
    }
  }

  triggerScenario(name) {
    if (this.source === 'DEMO') {
      simulationService.triggerScenario(name);
    }
  }

  setMonitoringStatus(newStatus) {
    if (this.source === 'DEMO') {
      simulationService.setStatus(newStatus);
      this.latestTelemetry.status = newStatus;
      this.handleIncomingTelemetry(this.latestTelemetry);
    } else if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ command: 'SET_STATUS', status: newStatus }));
    }
  }

  updateThresholds(newThresholds) {
    if (this.source === 'DEMO') {
      simulationService.setThresholds(newThresholds);
    } else {
      fetch('http://localhost:8000/api/device/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newThresholds)
      }).catch(err => console.error("Error updating thresholds:", err));
    }
  }

  async calibrate() {
    if (this.source === 'DEMO') {
      const res = await simulationService.calibrateSensor();
      this.recordEvent({
        type: 'SENSOR_CALIBRATION',
        category: 'Calibration',
        severity: 'normal',
        message: res.message,
        linear_accel: 0.02,
        gyro: 0.5,
        roll: 0.0,
        pitch: 0.0,
        alarm: false
      });
      return res;
    } else {
      const res = await fetch('http://localhost:8000/api/device/calibrate', { method: 'POST' });
      return await res.json();
    }
  }

  getEventHistory() {
    return [...this.eventHistory];
  }

  clearEventHistory() {
    this.eventHistory = [];
    this.saveEvents();
    this.eventSubscribers.forEach((cb) => cb(null, []));
    if (this.source === 'LIVE') {
      fetch('http://localhost:8000/api/events', { method: 'DELETE' }).catch(() => {});
    }
  }

  // --- Hardware Management REST calls ---
  async fetchAvailablePorts() {
    try {
      const res = await fetch('http://localhost:8000/api/ports');
      return await res.json();
    } catch {
      return [{ port: 'COM5', desc: 'Silicon Labs CP210x USB to UART Bridge (COM5)' }];
    }
  }

  async connectHardware(port = 'COM5', baudRate = 115200) {
    try {
      const res = await fetch('http://localhost:8000/api/device/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port, baud_rate: parseInt(baudRate, 10), auto_reconnect: true })
      });
      const data = await res.json();
      return data;
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }

  async disconnectHardware() {
    try {
      const res = await fetch('http://localhost:8000/api/device/disconnect', { method: 'POST' });
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }

  async fetchDeviceStatus() {
    try {
      const res = await fetch('http://localhost:8000/api/device/status');
      return await res.json();
    } catch {
      return this.hardwareStatus;
    }
  }

  // --- WebSocket Connection ---
  connectWebSocket(url = 'ws://localhost:8000/ws/telemetry') {
    if (this.socket) {
      this.socket.close();
    }

    this.connectionState = 'connecting';
    this.notifyConnection();

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.connectionState = 'connected';
        this.notifyConnection();
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'telemetry') {
            this.handleIncomingTelemetry(data.payload);
          } else if (data.type === 'event') {
            this.recordEvent(data.payload);
          } else if (data.type === 'connection_status') {
            this.hardwareStatus = data.payload;
            if (data.payload.state === 'CONNECTED') {
              this.connectionState = 'connected';
            } else if (data.payload.state === 'ERROR') {
              this.connectionState = 'error';
            } else {
              this.connectionState = 'disconnected';
            }
            this.notifyConnection();
          }
        } catch (err) {
          console.error('Error parsing incoming WebSocket message:', err);
        }
      };

      this.socket.onclose = () => {
        if (this.source === 'LIVE') {
          this.connectionState = 'disconnected';
          this.notifyConnection();
        }
      };

      this.socket.onerror = () => {
        if (this.source === 'LIVE') {
          this.connectionState = 'error';
          this.notifyConnection();
        }
      };
    } catch {
      if (this.source === 'LIVE') {
        this.connectionState = 'error';
        this.notifyConnection();
      }
    }
  }
}

export const dataService = new DataService();
