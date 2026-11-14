import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Bell,
  Zap,
  CheckCircle2,
  AlertOctagon,
  HelpCircle,
  Activity
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';

export function DetectionEventsPage({
  telemetry,
  events,
  onResetAlarm,
  onManualAlarmTest,
  onTriggerScenario
}) {
  const isAlarm = Boolean(telemetry?.alarm);
  const isWarning = Boolean(telemetry?.tilt_alert || telemetry?.motion_alert);

  // Filter detection events
  const detectionEvents = events.filter(
    (e) =>
      e.category === 'Sudden Movement' ||
      e.category === 'Excessive Tilt' ||
      e.category === 'Impact Trigger' ||
      e.category === 'Alarm Test' ||
      e.category === 'System Reset'
  );

  return (
    <div className="space-y-6">
      {/* Educational & Scientific Disclaimer Banner */}
      <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-amber-950/40 p-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold font-mono text-amber-200 uppercase tracking-tight">
              Educational Prototype Distinction: Motion Anomaly vs. Certified Crash
            </h4>
            <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              SYNCORE is an <strong>experimental IoT prototype</strong> designed for academic and laboratory research with the ESP32 and MPU6050. The system monitors kinematic anomalies (sharp deceleration, dynamic angular velocity and lateral tilt). 
              <strong> A detected motion event or tilt alert does NOT constitute a certified automotive collision.</strong> 
              Real automotive crash safety systems utilize multi-redundant MEMS sensors, structural crush sensors, seat-belt pyrotechnic triggers, and validated ASIL-D automotive safety microcontrollers.
            </p>
          </div>
        </div>
      </div>

      {/* Detection System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Detection Status */}
        <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>DETECTION PIPELINE</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1">
            <span className="text-xl font-bold font-mono text-slate-100">
              {telemetry.status === 'MONITORING' ? 'ACTIVE SAMPLING' : 'STANDBY'}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">MPU6050 FIFO:</span>
            <span className="text-emerald-400">ONLINE</span>
          </div>
        </div>

        {/* Current Alarm State */}
        <div
          className={`rounded-xl border p-4 ${
            isAlarm
              ? 'border-rose-500 bg-rose-950/40'
              : 'border-slate-800 bg-[#10141E]/90'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>CURRENT ALARM STATE</span>
            <StatusBadge
              type={isAlarm ? 'alarm' : isWarning ? 'warning' : 'normal'}
              label={isAlarm ? 'ALARM ON' : 'CLEAR'}
              size="sm"
            />
          </div>
          <div className="my-1">
            <span
              className={`text-xl font-bold font-mono ${
                isAlarm ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
              }`}
            >
              {isAlarm ? 'CRITICAL ALARM' : 'ALL CLEAR'}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Audio/Visual Buzzer:</span>
            <span className={isAlarm ? 'text-rose-300 font-bold' : 'text-slate-400'}>
              {isAlarm ? 'SOUNDING' : 'MUTED'}
            </span>
          </div>
        </div>

        {/* Sudden Movement Alert */}
        <div
          className={`rounded-xl border p-4 ${
            telemetry.motion_alert
              ? 'border-amber-500/60 bg-amber-950/30'
              : 'border-slate-800 bg-[#10141E]/90'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>SUDDEN MOVEMENT</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-1">
            <span
              className={`text-xl font-bold font-mono ${
                telemetry.motion_alert ? 'text-amber-400' : 'text-slate-300'
              }`}
            >
              {telemetry.motion_alert ? 'SPIKE DETECTED' : 'NORMAL RANGE'}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Current Linear Accel:</span>
            <span className="text-slate-200 font-bold">{telemetry.linear_accel} G</span>
          </div>
        </div>

        {/* Excessive Sideways Tilt */}
        <div
          className={`rounded-xl border p-4 ${
            telemetry.tilt_alert
              ? 'border-rose-500/60 bg-rose-950/30'
              : 'border-slate-800 bg-[#10141E]/90'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>SIDEWAYS TILT ALERT</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-1">
            <span
              className={`text-xl font-bold font-mono ${
                telemetry.tilt_alert ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {telemetry.tilt_alert ? 'EXCESSIVE ROLL' : 'STABLE LEVEL'}
            </span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Current Roll Angle:</span>
            <span className="text-slate-200 font-bold">{telemetry.roll}°</span>
          </div>
        </div>
      </div>

      {/* Interactive Verification & Test Bench */}
      <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold font-mono text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              EXPERIMENTAL DETECTION TEST BENCH
            </h3>
            <p className="text-xs text-slate-400">
              Trigger monitored crash events to test threshold interrupts and system response.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onResetAlarm}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs transition cursor-pointer active:scale-95 shadow"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Detector Reset
            </button>
            <button
              onClick={onManualAlarmTest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white font-mono text-xs transition cursor-pointer active:scale-95 border border-amber-400/40"
            >
              <Bell className="w-3.5 h-3.5" />
              Manual Alarm Test
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-3.5 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-slate-300">
                1. Sudden Movement Trigger
              </span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Simulates dynamic peak deceleration &gt; 2.5G typical of severe braking or obstacle contact.
            </p>
            <button
              onClick={() => onTriggerScenario('spike')}
              className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-amber-300 border border-slate-700 transition cursor-pointer"
            >
              Trigger Motion Spike (3.2G)
            </button>
          </div>

          <div className="bg-black/30 rounded-lg p-3.5 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-slate-300">
                2. Excessive Sideways Tilt Trigger
              </span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Simulates severe vehicle tilt past 45.0° representing dynamic rollover or ditch rollover.
            </p>
            <button
              onClick={() => onTriggerScenario('tilt')}
              className="w-full py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-rose-300 border border-slate-700 transition cursor-pointer"
            >
              Trigger Tilt Rollover (55°)
            </button>
          </div>

          <div className="bg-black/30 rounded-lg p-3.5 border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-semibold text-slate-300">
                3. Combined Crash Event Trigger
              </span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Combines high-G multi-axis impact spike + rapid angular velocity + rollover tilt angle.
            </p>
            <button
              onClick={() => onTriggerScenario('crash')}
              className="w-full py-1.5 px-3 rounded bg-rose-950/70 hover:bg-rose-900 text-xs font-mono text-rose-200 border border-rose-500/50 transition cursor-pointer font-bold shadow-sm"
            >
              Trigger Combined Impact
            </button>
          </div>
        </div>
      </div>

      {/* Monitored Detection Event Feed */}
      <div className="rounded-xl border border-slate-800 bg-[#10141E]/90 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold font-mono text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              DETECTION SYSTEM AUDIT LOG (LATEST TRIGGERED EVENTS)
            </h3>
            <p className="text-xs text-slate-400">
              Live log of motion detections, threshold exceedances, and operator resets.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Showing {detectionEvents.length} events
          </span>
        </div>

        <div className="space-y-2.5">
          {detectionEvents.length === 0 ? (
            <div className="text-center py-8 text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-lg">
              No detection events recorded yet. Use the test bench above to simulate motion anomalies.
            </div>
          ) : (
            detectionEvents.map((evt) => (
              <div
                key={evt.id}
                className="bg-black/30 border border-slate-800/80 rounded-lg p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      evt.category.includes('Impact') || evt.category.includes('Excessive')
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : evt.category.includes('Test')
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : evt.category.includes('Reset')
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {evt.category.includes('Reset') ? (
                      <RotateCcw className="w-4 h-4" />
                    ) : evt.category.includes('Test') ? (
                      <Bell className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {evt.category}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        ID: {evt.id}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{evt.message}</p>
                  </div>
                </div>

                {/* Captured Kinematics at Detection Time */}
                <div className="flex items-center gap-3 bg-black/50 px-3 py-1.5 rounded border border-white/5 font-mono text-xs self-start md:self-center shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-500 block">ACCEL</span>
                    <span className="text-slate-200 font-bold">{evt.linear_accel ?? '--'} G</span>
                  </div>
                  <div className="border-l border-slate-800 pl-3">
                    <span className="text-[10px] text-slate-500 block">GYRO</span>
                    <span className="text-slate-200">{evt.gyro ?? '--'} °/s</span>
                  </div>
                  <div className="border-l border-slate-800 pl-3">
                    <span className="text-[10px] text-slate-500 block">ROLL</span>
                    <span className="text-slate-200">{evt.roll ?? '--'}°</span>
                  </div>
                  <div className="border-l border-slate-800 pl-3">
                    <span className="text-[10px] text-slate-500 block">ALARM</span>
                    <span className={evt.alarm ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {evt.alarm ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
