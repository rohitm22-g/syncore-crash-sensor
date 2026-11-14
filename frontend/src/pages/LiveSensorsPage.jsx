import React, { useState } from 'react';
import { Radio, Gauge, Activity, Compass, Zap, Eye, RefreshCw } from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { AttitudeIndicator } from '../components/AttitudeIndicator';
import { TelemetryChart } from '../charts/TelemetryChart';

export function LiveSensorsPage({ telemetry, chartData, onCalibrate }) {
  const [chartView, setChartView] = useState('all'); // 'all', 'accel', 'gyro', 'orientation'
  const [calibrating, setCalibrating] = useState(false);
  const [calibMsg, setCalibMsg] = useState('');

  const handleCalibrate = async () => {
    setCalibrating(true);
    setCalibMsg('Calibrating zero-offsets on MPU6050...');
    try {
      const res = await onCalibrate();
      setCalibMsg(res?.message || 'Calibration completed.');
      setTimeout(() => setCalibMsg(''), 4000);
    } catch {
      setCalibMsg('Calibration failed.');
    } finally {
      setCalibrating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold font-mono tracking-tight text-white">
              Live Sensor Monitoring
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300">
              MPU6050 6-DoF IMU
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time telemetry stream sampled at 100ms. High-speed multi-axis kinematic tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCalibrate}
            disabled={calibrating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-700 text-xs font-mono text-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${calibrating ? 'animate-spin text-cyan-400' : ''}`} />
            {calibrating ? 'Calibrating...' : 'Zero-Calibrate Sensor'}
          </button>
        </div>
      </div>

      {calibMsg && (
        <div className="bg-cyan-950/40 border border-cyan-500/50 rounded-lg p-3 text-xs font-mono text-cyan-300 flex items-center justify-between">
          <span>{calibMsg}</span>
          <span className="text-[10px] text-slate-400">MPU6050 offsets updated</span>
        </div>
      )}

      {/* 1. Accelerometer Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold font-mono text-slate-200 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-cyan-400" />
            1. ACCELEROMETER TELEMETRY (±2G/±16G SENSING)
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Current Magnitude: <strong className="text-cyan-300">{telemetry.linear_accel} G</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="X-Axis Acceleration"
            value={telemetry.ax ?? 0}
            unit="G"
            subtitle="Lateral Surge"
            status={Math.abs(telemetry.ax ?? 0) > 1.5 ? 'warning' : 'normal'}
            details={[
              { label: 'Unit', value: 'G (9.81 m/s²)' },
              { label: 'Raw Count', value: `${Math.round((telemetry.ax ?? 0) * 16384)}` },
              { label: 'Bias Corr', value: '0.00' }
            ]}
          />

          <MetricCard
            title="Y-Axis Acceleration"
            value={telemetry.ay ?? 0}
            unit="G"
            subtitle="Sway / Lateral"
            status={Math.abs(telemetry.ay ?? 0) > 1.5 ? 'warning' : 'normal'}
            details={[
              { label: 'Unit', value: 'G' },
              { label: 'Raw Count', value: `${Math.round((telemetry.ay ?? 0) * 16384)}` },
              { label: 'Bias Corr', value: '0.00' }
            ]}
          />

          <MetricCard
            title="Z-Axis Acceleration"
            value={telemetry.az ?? 1}
            unit="G"
            subtitle="Vertical (Static 1G)"
            status={Math.abs((telemetry.az ?? 1) - 1.0) > 1.2 ? 'warning' : 'normal'}
            details={[
              { label: 'Unit', value: 'G' },
              { label: 'Raw Count', value: `${Math.round((telemetry.az ?? 1) * 16384)}` },
              { label: 'Static Ref', value: '1.00 G' }
            ]}
          />

          <MetricCard
            title="Linear Accel Magnitude"
            value={telemetry.linear_accel}
            unit="G"
            subtitle="Dynamic Resultant"
            highlightValue={true}
            status={telemetry.linear_accel > 2.5 ? 'alarm' : telemetry.linear_accel > 1.2 ? 'warning' : 'normal'}
            details={[
              { label: 'Formula', value: '√(Ax²+Ay²+Az²)' },
              { label: 'Threshold', value: '2.50 G' },
              { label: 'Alert Flag', value: telemetry.motion_alert ? 'ACTIVE' : 'CLEAR' }
            ]}
          />
        </div>
      </div>

      {/* 2. Gyroscope Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold font-mono text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            2. GYROSCOPE TELEMETRY (±250°/s ROTATION)
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Total Angular Rate: <strong className="text-amber-300">{telemetry.gyro} °/s</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="X-Axis Angular Velocity"
            value={telemetry.gx ?? 0}
            unit="°/s"
            subtitle="Roll Rate (p)"
            status={Math.abs(telemetry.gx ?? 0) > 120 ? 'warning' : 'normal'}
            details={[
              { label: 'Axis', value: 'Roll (p)' },
              { label: 'DPS', value: `${telemetry.gx ?? 0}°/s` },
              { label: 'Bandwidth', value: '42 Hz' }
            ]}
          />

          <MetricCard
            title="Y-Axis Angular Velocity"
            value={telemetry.gy ?? 0}
            unit="°/s"
            subtitle="Pitch Rate (q)"
            status={Math.abs(telemetry.gy ?? 0) > 120 ? 'warning' : 'normal'}
            details={[
              { label: 'Axis', value: 'Pitch (q)' },
              { label: 'DPS', value: `${telemetry.gy ?? 0}°/s` },
              { label: 'Bandwidth', value: '42 Hz' }
            ]}
          />

          <MetricCard
            title="Z-Axis Angular Velocity"
            value={telemetry.gz ?? 0}
            unit="°/s"
            subtitle="Yaw Rate (r)"
            status={Math.abs(telemetry.gz ?? 0) > 120 ? 'warning' : 'normal'}
            details={[
              { label: 'Axis', value: 'Yaw (r)' },
              { label: 'DPS', value: `${telemetry.gz ?? 0}°/s` },
              { label: 'Bandwidth', value: '42 Hz' }
            ]}
          />

          <MetricCard
            title="Total Angular Velocity"
            value={telemetry.gyro}
            unit="°/s"
            subtitle="Magnitude Vector"
            highlightValue={true}
            status={telemetry.gyro > 200 ? 'alarm' : telemetry.gyro > 70 ? 'warning' : 'normal'}
            details={[
              { label: 'Formula', value: '√(Gx²+Gy²+Gz²)' },
              { label: 'Threshold', value: '200.0 °/s' },
              { label: 'Shear Alert', value: telemetry.gyro > 200 ? 'ACTIVE' : 'CLEAR' }
            ]}
          />
        </div>
      </div>

      {/* 3. Orientation & Graphical Real-Time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <AttitudeIndicator
            roll={telemetry.roll}
            pitch={telemetry.pitch}
            tiltAlert={telemetry.tilt_alert}
            threshold={45}
          />

          <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-4 space-y-3 font-mono text-xs">
            <span className="text-slate-400 font-semibold block uppercase">
              Filter / Sensor Fusion
            </span>
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-400">Complementary Filter:</span>
              <span className="text-emerald-400">α = 0.96 (Gyro) / 0.04 (Acc)</span>
            </div>
            <div className="flex justify-between border-b border-slate-800 pb-1.5">
              <span className="text-slate-400">Roll Boundary (Tilt):</span>
              <span className="text-rose-400">±45.0° Threshold</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pitch Boundary:</span>
              <span className="text-slate-300">±35.0° Threshold</span>
            </div>
          </div>
        </div>

        {/* Real-time Dynamic Charts */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#10141E]/90 p-4.5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h4 className="text-sm font-semibold font-mono text-slate-100">
                Continuous Real-Time Sensor Telemetry
              </h4>
              <p className="text-xs text-slate-400">
                Updates smoothly at 10Hz without full DOM page reloads.
              </p>
            </div>

            {/* View Selector */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/5 text-xs font-mono">
              <button
                onClick={() => setChartView('all')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  chartView === 'all'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Kinematics
              </button>
              <button
                onClick={() => setChartView('accel')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  chartView === 'accel'
                    ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Accelerometer (Ax, Ay, Az)
              </button>
              <button
                onClick={() => setChartView('orientation')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  chartView === 'orientation'
                    ? 'bg-amber-900/60 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Roll & Pitch
              </button>
            </div>
          </div>

          {/* Chart Rendering */}
          {chartView === 'all' && (
            <div>
              <div className="text-xs font-mono text-slate-400 mb-1 flex justify-between">
                <span>Linear Accel (Cyan) vs Roll Angle (Amber)</span>
                <span>Threshold: 2.5G Impact / 45° Tilt</span>
              </div>
              <TelemetryChart
                data={chartData}
                height={260}
                series={[
                  { key: 'linear_accel', name: 'Linear Accel (G)', color: '#38BDF8', strokeWidth: 2 },
                  { key: 'roll', name: 'Roll Angle (°)', color: '#F59E0B', strokeWidth: 1.8 }
                ]}
                referenceLines={[
                  { value: 2.5, color: '#F43F5E', label: '2.5G Threshold' },
                  { value: 45.0, color: '#FB7185', label: '45° Tilt Alarm' }
                ]}
              />
            </div>
          )}

          {chartView === 'accel' && (
            <div>
              <div className="text-xs font-mono text-slate-400 mb-1 flex justify-between">
                <span>Tri-Axial Accelerometer (Ax: Violet, Ay: Sky, Az: Emerald)</span>
                <span>Unit: G</span>
              </div>
              <TelemetryChart
                data={chartData}
                height={260}
                series={[
                  { key: 'ax', name: 'Ax (G)', color: '#A78BFA', strokeWidth: 1.5 },
                  { key: 'ay', name: 'Ay (G)', color: '#38BDF8', strokeWidth: 1.5 },
                  { key: 'az', name: 'Az (G)', color: '#34D399', strokeWidth: 1.5 },
                  { key: 'linear_accel', name: 'Linear Magnitude (G)', color: '#F43F5E', strokeWidth: 2 }
                ]}
              />
            </div>
          )}

          {chartView === 'orientation' && (
            <div>
              <div className="text-xs font-mono text-slate-400 mb-1 flex justify-between">
                <span>Orientation Angles (Roll: Amber, Pitch: Indigo)</span>
                <span>Unit: Degrees (°)</span>
              </div>
              <TelemetryChart
                data={chartData}
                height={260}
                series={[
                  { key: 'roll', name: 'Roll Angle (°)', color: '#F59E0B', strokeWidth: 2 },
                  { key: 'pitch', name: 'Pitch Angle (°)', color: '#818CF8', strokeWidth: 1.8 }
                ]}
                referenceLines={[
                  { value: 45, color: '#E11D48', label: '+45° Rollover Limit' },
                  { value: -45, color: '#E11D48', label: '-45° Rollover Limit' }
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
