import React from 'react';
import {
  Activity,
  Gauge,
  Compass,
  AlertOctagon,
  Clock,
  RotateCcw,
  Zap,
  Info
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { AttitudeIndicator } from '../components/AttitudeIndicator';
import { AlarmBanner } from '../components/AlarmBanner';
import { StatusBadge } from '../components/StatusBadge';
import { SimulationControls } from '../components/SimulationControls';
import { TelemetryChart } from '../charts/TelemetryChart';

export function DashboardPage({
  telemetry,
  chartData,
  events,
  connection,
  onResetAlarm,
  onManualAlarmTest,
  onTriggerScenario,
  onToggleDataSource,
  onNavigate
}) {
  const isAlarm = Boolean(telemetry?.alarm);
  const isWarning = Boolean(telemetry?.tilt_alert || telemetry?.motion_alert);
  const latestEvent = events[0];

  const overallStatus = isAlarm ? 'alarm' : isWarning ? 'warning' : 'normal';

  return (
    <div className="space-y-6">
      {/* Educational Prototype Disclaimer */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-2 flex items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong>SYNCORE Research Prototype:</strong> Experimental ESP32 + MPU6050 crash & motion anomaly detection system. Real-time telemetry monitoring.
          </span>
        </div>
        <span className="hidden md:inline font-mono text-[10px] text-slate-400 uppercase tracking-wider">
          Node: ESP32-WROOM-32
        </span>
      </div>

      {/* Primary Alarm Banner (Shown when alarm or warning triggered) */}
      <AlarmBanner
        telemetry={telemetry}
        onReset={onResetAlarm}
        onTest={onManualAlarmTest}
      />

      {/* Main Status & Executive Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Connection State */}
        <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>DEVICE CONNECTION</span>
            <span className="text-[10px] text-slate-400">USB / UART</span>
          </div>
          <div className="flex items-center gap-2.5 my-1">
            <span className="text-xl font-bold font-mono text-slate-100">
              {connection.source === 'DEMO' ? 'SIMULATOR ACTIVE' : connection.state.toUpperCase()}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Port / Feed:</span>
            <span className="text-slate-300">
              {connection.source === 'DEMO' ? 'Synthetic MPU6050 (10Hz)' : 'COM4 @ 115200'}
            </span>
          </div>
        </div>

        {/* Monitoring State */}
        <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>DETECTOR STATE</span>
            <StatusBadge
              type={telemetry.status === 'MONITORING' ? 'monitoring' : 'standby'}
              label={telemetry.status}
              size="sm"
            />
          </div>
          <div className="flex items-center gap-2 my-1">
            <span className="text-xl font-bold font-mono text-slate-100">
              {telemetry.status === 'MONITORING' ? 'CONTINUOUS SENSING' : 'IDLE / PAUSED'}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Sampling Rate:</span>
            <span className="text-emerald-400">100 ms (10 Hz)</span>
          </div>
        </div>

        {/* Alarm State */}
        <div
          className={`rounded-xl border p-4 transition-all ${
            isAlarm
              ? 'border-rose-500 bg-rose-950/40 shadow-lg shadow-rose-950/50'
              : 'border-slate-800 bg-[#10141E]/90'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>ALARM STATUS</span>
            <StatusBadge
              type={isAlarm ? 'alarm' : isWarning ? 'warning' : 'normal'}
              label={isAlarm ? 'TRIGGERED' : isWarning ? 'ANOMALY' : 'NORMAL'}
              size="sm"
            />
          </div>
          <div className="flex items-center gap-2 my-1">
            <span
              className={`text-xl font-bold font-mono ${
                isAlarm ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
              }`}
            >
              {isAlarm ? 'ALARM ACTIVE' : 'NOMINAL SAFE'}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Interlock:</span>
            <span className={isAlarm ? 'text-rose-300 font-bold' : 'text-slate-300'}>
              {isAlarm ? 'Awaiting Operator Reset' : 'Armed & Ready'}
            </span>
          </div>
        </div>

        {/* Latest Detected Event */}
        <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>LATEST EVENT</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="my-1">
            <span className="text-sm font-semibold font-mono text-slate-200 block truncate">
              {latestEvent?.category || 'No Incidents Logged'}
            </span>
            <span className="text-xs text-slate-400 truncate block mt-0.5">
              {latestEvent?.message || 'System nominal. Monitoring background acceleration.'}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Timestamp:</span>
            <span className="text-slate-300">
              {latestEvent?.timestamp
                ? new Date(latestEvent.timestamp).toLocaleTimeString()
                : '--:--:--'}
            </span>
          </div>
        </div>
      </div>

      {/* Real-Time Sensor Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Linear Acceleration */}
        <MetricCard
          title="Linear Acceleration"
          value={telemetry.linear_accel}
          unit="G"
          icon={Gauge}
          status={
            telemetry.linear_accel > 2.5
              ? 'alarm'
              : telemetry.linear_accel > 1.2
              ? 'warning'
              : 'normal'
          }
          subtitle="Dynamic Motion (MPU6050)"
          details={[
            { label: 'Ax', value: telemetry.ax ?? 0 },
            { label: 'Ay', value: telemetry.ay ?? 0 },
            { label: 'Az', value: telemetry.az ?? 1 }
          ]}
        />

        {/* Angular Velocity */}
        <MetricCard
          title="Angular Velocity (Gyro)"
          value={telemetry.gyro}
          unit="°/s"
          icon={Activity}
          status={telemetry.gyro > 200 ? 'alarm' : telemetry.gyro > 70 ? 'warning' : 'normal'}
          subtitle="Rotational Rate"
          details={[
            { label: 'Gx', value: telemetry.gx ?? 0 },
            { label: 'Gy', value: telemetry.gy ?? 0 },
            { label: 'Gz', value: telemetry.gz ?? 0 }
          ]}
        />

        {/* Current Roll Angle */}
        <MetricCard
          title="Roll Angle (Lateral Tilt)"
          value={telemetry.roll}
          unit="°"
          icon={Compass}
          status={Math.abs(telemetry.roll) > 45 ? 'alarm' : Math.abs(telemetry.roll) > 25 ? 'warning' : 'normal'}
          subtitle="Limit: ±45.0°"
          details={[
            { label: 'Status', value: Math.abs(telemetry.roll) > 45 ? 'CRITICAL' : 'OK' },
            { label: 'Tilt Alert', value: telemetry.tilt_alert ? 'TRUE' : 'FALSE' },
            { label: 'Threshold', value: '45.0°' }
          ]}
        />

        {/* Current Pitch Angle */}
        <MetricCard
          title="Pitch Angle (Longitudinal)"
          value={telemetry.pitch}
          unit="°"
          icon={Compass}
          status={Math.abs(telemetry.pitch) > 35 ? 'warning' : 'normal'}
          subtitle="Incline / Grade"
          details={[
            { label: 'Motion Alert', value: telemetry.motion_alert ? 'TRIGGERED' : 'CLEAR' },
            { label: 'Gravity Vec', value: '1.00 G' },
            { label: 'Threshold', value: '±35.0°' }
          ]}
        />
      </div>

      {/* Visual Orientation & Real-time Live Chart Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Attitude Indicator */}
        <div className="lg:col-span-1">
          <AttitudeIndicator
            roll={telemetry.roll}
            pitch={telemetry.pitch}
            tiltAlert={telemetry.tilt_alert}
            threshold={45}
          />
        </div>

        {/* Live Trend Preview Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-[#10141E]/90 p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400 block">
                Dynamic Kinematics Stream (Rolling 40 Samples)
              </span>
              <p className="text-xs text-slate-400">
                Live acceleration magnitude (G) & rotational velocity (°/s / 100)
              </p>
            </div>
            <button
              onClick={() => onNavigate('live-sensors')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
            >
              Full Screen Sensors &rarr;
            </button>
          </div>

          <TelemetryChart
            data={chartData}
            height={220}
            series={[
              { key: 'linear_accel', name: 'Linear Accel (G)', color: '#38BDF8', strokeWidth: 2 },
              { key: 'roll', name: 'Roll Angle (°)', color: '#F59E0B', strokeWidth: 1.5 }
            ]}
            referenceLines={[
              { value: 2.5, color: '#F43F5E', label: 'Impact Threshold (2.5G)' }
            ]}
          />
        </div>
      </div>

      {/* Simulation Scenario Trigger Panel */}
      <SimulationControls
        onTriggerScenario={onTriggerScenario}
        onResetAlarm={onResetAlarm}
        onManualAlarmTest={onManualAlarmTest}
        isAlarm={isAlarm}
        dataSource={connection.source}
        onToggleDataSource={onToggleDataSource}
      />

      {/* Recent Event History Quick View */}
      <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-cyan-400" />
            <h4 className="text-sm font-semibold text-slate-200">Recent Detection History</h4>
          </div>
          <button
            onClick={() => onNavigate('event-history')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
          >
            View All ({events.length}) &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 px-3">TIMESTAMP</th>
                <th className="py-2 px-3">CATEGORY</th>
                <th className="py-2 px-3">LINEAR ACCEL</th>
                <th className="py-2 px-3">GYRO</th>
                <th className="py-2 px-3">ROLL</th>
                <th className="py-2 px-3">PITCH</th>
                <th className="py-2 px-3">ALARM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {events.slice(0, 5).map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-2 px-3 text-slate-400">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        evt.category.includes('Impact') || evt.category.includes('Excessive')
                          ? 'bg-rose-950/70 text-rose-300 border border-rose-500/40'
                          : evt.category.includes('Test')
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {evt.category}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-200 font-bold">
                    {evt.linear_accel ?? '--'} G
                  </td>
                  <td className="py-2 px-3 text-slate-200">{evt.gyro ?? '--'} °/s</td>
                  <td className="py-2 px-3 text-slate-200">{evt.roll ?? '--'}°</td>
                  <td className="py-2 px-3 text-slate-200">{evt.pitch ?? '--'}°</td>
                  <td className="py-2 px-3">
                    <StatusBadge
                      type={evt.alarm ? 'alarm' : 'normal'}
                      label={evt.alarm ? 'TRIGGERED' : 'CLEAR'}
                      size="sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
