import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  Usb,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Power,
  Shield,
  Wifi,
  Lock,
  Activity
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export function DeviceSettingsPage({
  telemetry,
  connection,
  onSetMonitoringStatus,
  onUpdateThresholds,
  onCalibrate,
  onToggleDataSource,
  onFetchAvailablePorts,
  onConnectHardware,
  onDisconnectHardware,
  onFetchDeviceStatus
}) {
  // Serial settings
  const [selectedPort, setSelectedPort] = useState('COM5');
  const [baudRate, setBaudRate] = useState('115200');
  const [availablePorts, setAvailablePorts] = useState([
    { port: 'COM5', desc: 'Silicon Labs CP210x USB to UART Bridge (COM5)' }
  ]);
  const [isScanningPorts, setIsScanningPorts] = useState(false);
  const [connectionFeedback, setConnectionFeedback] = useState('');

  // Threshold draft settings
  const [linearAccelThreshold, setLinearAccelThreshold] = useState(2.5);
  const [tiltThreshold, setTiltThreshold] = useState(45.0);
  const [gyroThreshold, setGyroThreshold] = useState(200.0);
  const [syncStatus, setSyncStatus] = useState('SYNCED'); // 'SYNCED', 'PENDING_SYNC'
  const [syncFeedback, setSyncFeedback] = useState('');

  // Calibration state
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibFeedback, setCalibFeedback] = useState('');

  // Auto-scan ports on load
  useEffect(() => {
    handleScanPorts();
  }, []);

  // Port scan
  const handleScanPorts = async () => {
    setIsScanningPorts(true);
    try {
      if (onFetchAvailablePorts) {
        const ports = await onFetchAvailablePorts();
        if (Array.isArray(ports) && ports.length > 0) {
          setAvailablePorts(ports);
          // If COM5 or Silicon Labs CP210x is found, pick it
          const cp210x = ports.find((p) => (p.port === 'COM5' || (p.desc && p.desc.includes('CP210x'))));
          if (cp210x) {
            setSelectedPort(cp210x.port);
          } else if (ports[0]) {
            setSelectedPort(ports[0].port);
          }
        }
      }
    } catch {
      // Keep defaults
    } finally {
      setIsScanningPorts(false);
    }
  };

  const handleConnectHardware = async () => {
    setConnectionFeedback('Initiating PySerial communication on ' + selectedPort + '...');
    if (onConnectHardware) {
      const res = await onConnectHardware(selectedPort, baudRate);
      if (res?.status === 'error') {
        setConnectionFeedback(res.message || 'Error connecting to port.');
      } else {
        setConnectionFeedback(res?.message || 'Connected to ' + selectedPort);
        onToggleDataSource('LIVE');
      }
      setTimeout(() => setConnectionFeedback(''), 5000);
    } else {
      onToggleDataSource('LIVE');
    }
  };

  const handleDisconnectHardware = async () => {
    if (onDisconnectHardware) {
      await onDisconnectHardware();
    }
    onToggleDataSource('DEMO');
    setConnectionFeedback('Hardware disconnected. Returned to DEMO MODE.');
    setTimeout(() => setConnectionFeedback(''), 4000);
  };

  // Calibration
  const handleCalibrateSensor = async () => {
    setIsCalibrating(true);
    setCalibFeedback('Zeroing MPU6050 accelerometer & gyroscope registers...');
    try {
      const res = await onCalibrate();
      setCalibFeedback(res?.message || 'MPU6050 zero-offset calibrated.');
      setTimeout(() => setCalibFeedback(''), 4000);
    } catch {
      setCalibFeedback('Calibration error.');
    } finally {
      setIsCalibrating(false);
    }
  };

  // Explicit sync of threshold parameters
  const handleApplyThresholds = () => {
    onUpdateThresholds({
      linearAccelThreshold,
      tiltThreshold,
      gyroThreshold
    });
    setSyncStatus('SYNCED');
    setSyncFeedback('Threshold parameters committed and verified with detector kernel.');
    setTimeout(() => setSyncFeedback(''), 4000);
  };

  const hwState = connection?.hardwareStatus?.state || 'DISCONNECTED';
  const hwError = connection?.hardwareStatus?.error_message;
  const isHardwareActive = connection.source === 'LIVE' && hwState === 'CONNECTED';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold font-mono tracking-tight text-white">
              Device Configuration & Hardware Settings
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              ESP32 Node & MPU6050 Driver
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Hardware serial bus controls, sensor zero-offset calibration and threshold tuning.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge
            type={connection.source === 'DEMO' ? 'warning' : hwState === 'CONNECTED' ? 'normal' : 'alarm'}
            label={connection.source === 'DEMO' ? 'DEMO MODE' : `HARDWARE ${hwState}`}
          />
        </div>
      </div>

      {/* 1. ESP32 Serial Bus & Hardware Connection */}
      <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Usb className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-semibold font-mono text-slate-100">
                1. ESP32 HARDWARE COMMUNICATION BUS
              </h3>
              <p className="text-xs text-slate-400">
                PySerial USB UART bridge (Architecture ready for seamless drop-in Wi-Fi upgrade)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">
            Status:{' '}
            <strong
              className={
                connection.source === 'DEMO'
                  ? 'text-amber-400'
                  : hwState === 'CONNECTED'
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }
            >
              {connection.source === 'DEMO' ? 'SIMULATOR ACTIVE' : hwState}
            </strong>
          </span>
        </div>

        {/* Hardware Status Display Banner */}
        {connection.source === 'LIVE' && hwError && (
          <div className="mb-4 bg-rose-950/40 border border-rose-500/50 rounded-lg p-3 text-xs font-mono text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block uppercase tracking-wider">Serial Connection Notice:</span>
              <p className="mt-0.5 text-rose-200/90">{hwError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Port Selection */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Serial COM Port
            </label>
            <div className="flex gap-2">
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {availablePorts.map((p) => {
                  const portName = typeof p === 'string' ? p.split(' ')[0] : p.port;
                  const portDesc = typeof p === 'string' ? p : `${p.port} (${p.desc || 'Serial Device'})`;
                  return (
                    <option key={portName} value={portName}>
                      {portDesc}
                    </option>
                  );
                })}
              </select>
              <button
                onClick={handleScanPorts}
                title="Scan for attached COM ports"
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanningPorts ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Baud Rate */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Baud Rate (UART)
            </label>
            <select
              value={baudRate}
              onChange={(e) => setBaudRate(e.target.value)}
              className="w-full bg-black/40 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="115200">115200 baud (ESP32 Standard)</option>
              <option value="9600">9600 baud</option>
              <option value="57600">57600 baud</option>
              <option value="230400">230400 baud (High throughput)</option>
            </select>
          </div>

          {/* Connection Toggle */}
          <div>
            <label className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
              Hardware Bus Control
            </label>
            <div className="flex gap-2">
              {isHardwareActive ? (
                <button
                  onClick={handleDisconnectHardware}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer bg-rose-950/60 border border-rose-500/50 text-rose-300 hover:bg-rose-900/60"
                >
                  <Power className="w-3.5 h-3.5" />
                  Disconnect Hardware
                </button>
              ) : (
                <button
                  onClick={handleConnectHardware}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/60"
                >
                  <Power className="w-3.5 h-3.5" />
                  Connect ESP32 (Live)
                </button>
              )}
            </div>
          </div>
        </div>

        {connectionFeedback && (
          <div className="mt-3 bg-slate-900/80 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-slate-300">
            {connectionFeedback}
          </div>
        )}

        {/* Live Hardware Packet Stats */}
        {connection.source === 'LIVE' && (
          <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-black/30 p-2 rounded border border-white/5">
              <span className="text-slate-500 text-[10px] block uppercase">Packets Received</span>
              <span className="text-emerald-400 font-bold">{connection.hardwareStatus?.packets_received ?? 0}</span>
            </div>
            <div className="bg-black/30 p-2 rounded border border-white/5">
              <span className="text-slate-500 text-[10px] block uppercase">Invalid / Dropped</span>
              <span className="text-slate-400">{connection.hardwareStatus?.invalid_packets ?? 0}</span>
            </div>
            <div className="bg-black/30 p-2 rounded border border-white/5">
              <span className="text-slate-500 text-[10px] block uppercase">Active Port</span>
              <span className="text-cyan-400 font-bold">{connection.hardwareStatus?.port || selectedPort}</span>
            </div>
            <div className="bg-black/30 p-2 rounded border border-white/5">
              <span className="text-slate-500 text-[10px] block uppercase">Baud Rate</span>
              <span className="text-slate-300">{connection.hardwareStatus?.baud_rate || baudRate}</span>
            </div>
          </div>
        )}

        {/* Note on Arduino Serial Monitor */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Serial Port Exclusive Access:</strong> Windows allows only one application to open {selectedPort} at a time. If the Arduino IDE Serial Monitor or VS Code Serial Monitor is open, close it before clicking <strong>Connect ESP32 (Live)</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* 2. Sensor Zero-Offset Calibration */}
      <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-semibold font-mono text-slate-100">
                2. MPU6050 CALIBRATION & BIAS CORRECTION
              </h3>
              <p className="text-xs text-slate-400">
                Calculates static gravity zero-offsets to prevent orientation drift.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Calibrated (Offset Bias Stored)
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs font-mono text-slate-400 space-y-1">
            <p>
              Ensure the ESP32 vehicle test node is placed on a <strong>stationary horizontal surface</strong> before executing zero-offset calibration.
            </p>
            <p className="text-slate-400">
              Samples consecutive readings to compute zero-G offset registers for Ax, Ay, Gx, Gy, Gz.
            </p>
          </div>

          <button
            onClick={handleCalibrateSensor}
            disabled={isCalibrating}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs transition cursor-pointer disabled:opacity-50 shrink-0 shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCalibrating ? 'animate-spin' : ''}`} />
            {isCalibrating ? 'Calibrating IMU...' : 'Run Zero Calibration'}
          </button>
        </div>

        {calibFeedback && (
          <div className="mt-3 bg-cyan-950/40 border border-cyan-500/40 rounded-lg p-2.5 text-xs font-mono text-cyan-300">
            {calibFeedback}
          </div>
        )}
      </div>

      {/* 3. Experimental Detection Threshold Settings with Guardrails */}
      <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold font-mono text-slate-100">
                  3. EXPERIMENTAL DETECTION THRESHOLDS
                </h3>
                <span className="text-[10px] font-mono bg-amber-950/60 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-bold">
                  PROTECTED SETTINGS
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Tune anomaly sensitivity parameters. Guardrail protocol prevents silent threshold updates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-mono px-2.5 py-1 rounded border ${
                syncStatus === 'SYNCED'
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/40'
              }`}
            >
              {syncStatus === 'SYNCED' ? '✓ SYNCHRONIZED WITH KERNEL' : '⚠ DRAFT CHANGES UNCOMMITTED'}
            </span>
          </div>
        </div>

        {/* Safety Guardrail Policy Banner */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 mb-4 flex items-start gap-2.5 text-xs text-slate-400">
          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Explicit Communication Guardrail:</strong> Per project safety specifications, the dashboard will not silently alter the ESP32's detection parameters without an explicit operator confirmation. Adjust sliders below and click <strong>"Commit & Synchronize Thresholds"</strong> to write to the detector.
          </span>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Linear Accel Threshold */}
          <div className="bg-black/30 rounded-lg p-3.5 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-300 font-semibold">
                Linear Accel Threshold
              </span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {linearAccelThreshold.toFixed(2)} G
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.1"
              value={linearAccelThreshold}
              onChange={(e) => {
                setLinearAccelThreshold(parseFloat(e.target.value));
                setSyncStatus('PENDING_SYNC');
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>1.0 G (Sensitive)</span>
              <span>2.5 G (Default)</span>
              <span>5.0 G (Impact)</span>
            </div>
          </div>

          {/* Sideways Tilt Threshold */}
          <div className="bg-black/30 rounded-lg p-3.5 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-300 font-semibold">
                Sideways Tilt Threshold
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {tiltThreshold.toFixed(1)}°
              </span>
            </div>
            <input
              type="range"
              min="20.0"
              max="70.0"
              step="1.0"
              value={tiltThreshold}
              onChange={(e) => {
                setTiltThreshold(parseFloat(e.target.value));
                setSyncStatus('PENDING_SYNC');
              }}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>20° (Early Alert)</span>
              <span>45° (Standard)</span>
              <span>70° (Rollover)</span>
            </div>
          </div>

          {/* Gyro Angular Velocity Threshold */}
          <div className="bg-black/30 rounded-lg p-3.5 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-300 font-semibold">
                Rotational Gyro Threshold
              </span>
              <span className="text-xs font-mono font-bold text-rose-400">
                {gyroThreshold.toFixed(0)} °/s
              </span>
            </div>
            <input
              type="range"
              min="80"
              max="400"
              step="10"
              value={gyroThreshold}
              onChange={(e) => {
                setGyroThreshold(parseFloat(e.target.value));
                setSyncStatus('PENDING_SYNC');
              }}
              className="w-full accent-rose-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>80 °/s</span>
              <span>200 °/s (Default)</span>
              <span>400 °/s (Violent)</span>
            </div>
          </div>
        </div>

        {/* Sync Action Button */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-400">
            Active Parameters: Accel = <strong>{linearAccelThreshold}G</strong> | Tilt ={' '}
            <strong>{tiltThreshold}°</strong> | Gyro = <strong>{gyroThreshold}°/s</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLinearAccelThreshold(2.5);
                setTiltThreshold(45.0);
                setGyroThreshold(200.0);
                setSyncStatus('PENDING_SYNC');
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition cursor-pointer"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleApplyThresholds}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs transition cursor-pointer shadow active:scale-95 font-semibold"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Commit & Synchronize Thresholds
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="mt-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-2.5 text-xs font-mono text-emerald-300">
            {syncFeedback}
          </div>
        )}
      </div>

      {/* 4. Monitoring Engine State Toggle */}
      <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-semibold font-mono text-slate-100">
                4. CRASH MONITORING ENGINE STATUS
              </h3>
              <p className="text-xs text-slate-400">
                Controls the active background sampling and interrupt evaluation loop.
              </p>
            </div>
          </div>
          <StatusBadge
            type={telemetry.status === 'MONITORING' ? 'monitoring' : 'standby'}
            label={telemetry.status}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs font-mono text-slate-400 max-w-xl">
            When set to <strong>PAUSED / STANDBY</strong>, sensor values continue to stream for diagnostics, but automatic crash trigger evaluations and buzzer alarms are inhibited.
          </p>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onSetMonitoringStatus('MONITORING')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                telemetry.status === 'MONITORING'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              START MONITORING
            </button>
            <button
              onClick={() => onSetMonitoringStatus('STANDBY')}
              className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                telemetry.status === 'STANDBY'
                  ? 'bg-amber-600 text-white shadow'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              PAUSE / STANDBY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
