# SYNCORE — Intelligent Crash Detection & Monitoring System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/Frontend-React%2019%20+%20Vite-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38bdf8.svg)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20+%20Python-009688.svg)](https://fastapi.tiangolo.com/)
[![Hardware](https://img.shields.io/badge/Hardware-ESP32%20+%20MPU6050-E7352C.svg)](https://www.espressif.com/)

SYNCORE is a dedicated, real-time crash and kinematic anomaly monitoring dashboard built for ESP32 and MPU6050 (6-DoF accelerometer & gyroscope). Engineered with an ultra-dark automotive safety interface, it tracks linear dynamic acceleration, rotational velocity, and spatial attitude (roll & pitch), alerting operators to sudden deceleration spikes and sideways rollovers.

> **Note:** This is an experimental educational/laboratory prototype for motion anomaly detection, not a certified automotive safety or restraint system.

---

## 🌟 Key Features

- **Automotive Safety UI Hierarchy:**
  - 🟢 **Normal (Green):** Continuous background telemetry monitoring.
  - 🟡 **Warning (Amber):** Motion spike ($> 2.5\text{ G}$) or approaching roll limits.
  - 🔴 **Alarm (Crimson):** Lateral tilt exceeded ($> 45^\circ$) or multi-axis impact detected.
  - ⚪ **Standby (Grey):** Detector paused or disconnected.
- **Artificial Horizon & Attitude Sphere:** Dynamic attitude indicator showing real-time roll and pitch with threshold limits and bank angle scale.
- **Decoupled Data Architecture:** Seamlessly hot-swaps between simulated **DEMO MODE** and live ESP32 serial telemetry via WebSockets.
- **Interactive Anomaly Test Bench:** Built-in triggers for sudden movement spikes, severe lateral rollover, hard braking, and combined impact.
- **Persistent SQLite Audit History:** Logs every anomaly event with exact multi-axis sensor readings at the moment of impact. Filter by date/category, and export to CSV or JSON.
- **Guardrail Parameter Synchronization:** Explicit communication protocol preventing silent threshold overwrites.

---

## 📐 Telemetry Data Format

The system communicates using structured JSON packets:

```json
{
  "linear_accel": 0.82,
  "gyro": 105.4,
  "roll": 12.5,
  "pitch": 3.2,
  "tilt_alert": false,
  "motion_alert": false,
  "alarm": false,
  "status": "MONITORING"
}
```

---

## 🛠️ Project Structure

```text
syncore/
├── frontend/                 # React 19 + Vite + Tailwind CSS + Recharts
│   ├── src/
│   │   ├── components/       # Metric cards, Attitude indicator, Alarm banner, Badges
│   │   ├── pages/            # Dashboard, LiveSensors, DetectionEvents, History, Settings
│   │   ├── charts/           # Real-time Recharts stream
│   │   ├── services/         # dataService.js, simulationService.js
│   │   ├── hooks/            # useTelemetry.js
│   │   └── layouts/          # MainLayout.jsx
├── backend/                  # Python FastAPI Backend
│   ├── app/
│   │   ├── main.py           # REST endpoints & WebSocket handler
│   │   ├── serial_reader.py  # PySerial bridge & auto-detection
│   │   ├── websocket_manager.py # Multi-client WebSocket hub
│   │   ├── database.py       # SQLite persistent storage engine
│   │   └── models.py         # Pydantic schemas
│   └── requirements.txt
└── firmware/
    └── syncore_esp32_mpu6050.ino # Ready-to-flash ESP32 + MPU6050 Arduino sketch
```

---

## 🚀 Quick Start Guide

### 1. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation available at [http://localhost:8000/docs](http://localhost:8000/docs).

### 3. Hardware Wiring (ESP32 + MPU6050)

| ESP32 Pin | MPU6050 Pin | Description |
| :--- | :--- | :--- |
| **3.3V** | `VCC` | Power (3.3V) |
| **GND** | `GND` | Ground |
| **GPIO21** | `SDA` | I2C Serial Data |
| **GPIO22** | `SCL` | I2C Serial Clock |
| **GPIO2** | Buzzer / LED | Optical / Acoustic Alarm indicator |

Flash `firmware/syncore_esp32_mpu6050.ino` using the Arduino IDE.

---

## 📄 License

MIT License. Developed for research and educational validation of IoT-based crash detection systems.
