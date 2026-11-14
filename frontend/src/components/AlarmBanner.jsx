import React from 'react';
import { AlertTriangle, Bell, RotateCcw } from 'lucide-react';

export function AlarmBanner({ telemetry, onReset, onTest }) {
  const isAlarm = Boolean(telemetry?.alarm);
  const isWarning = Boolean(telemetry?.tilt_alert || telemetry?.motion_alert);

  if (!isAlarm && !isWarning) {
    return null;
  }

  const isCritical = isAlarm;

  return (
    <div
      className={`w-full rounded-xl border p-4 mb-6 transition-all duration-300 shadow-lg ${
        isCritical
          ? 'bg-gradient-to-r from-rose-950/90 via-red-900/80 to-rose-950/90 border-rose-500/70 text-rose-100 shadow-rose-950/50'
          : 'bg-gradient-to-r from-amber-950/80 via-yellow-950/70 to-amber-950/80 border-amber-500/60 text-amber-100 shadow-amber-950/40'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`p-2.5 rounded-lg border ${
              isCritical
                ? 'bg-rose-500/20 border-rose-400/50 text-rose-300 animate-pulse'
                : 'bg-amber-500/20 border-amber-400/50 text-amber-300'
            }`}
          >
            {isCritical ? (
              <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            ) : (
              <Bell className="w-6 h-6 stroke-[2.2]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-black/40 border border-white/10">
                {isCritical ? 'CRITICAL ALARM ACTIVATED' : 'SENSORY ANOMALY WARNING'}
              </span>
              <span className="text-xs text-white/70 font-mono">
                {telemetry.timestamp
                  ? new Date(telemetry.timestamp).toLocaleTimeString()
                  : 'Active'}
              </span>
            </div>
            <h3 className="text-base font-medium mt-1 tracking-tight">
              {isCritical
                ? telemetry.tilt_alert && telemetry.motion_alert
                  ? 'Severe Motion Impact & Sideways Rollover Detected'
                  : telemetry.tilt_alert
                  ? 'Excessive Sideways Tilt / Rollover Angle Limit Exceeded'
                  : 'High-G Shock / Sudden Deceleration Detected'
                : telemetry.tilt_alert
                ? 'Sideways tilt angle approaching critical safety boundary'
                : 'Abnormal transient motion spike detected on sensor axes'}
            </h3>
            <p className="text-xs text-white/75 mt-0.5 font-mono">
              Linear Accel: <span className="text-white font-bold">{telemetry.linear_accel} G</span> | 
              Gyro: <span className="text-white font-bold">{telemetry.gyro} °/s</span> | 
              Roll: <span className="text-white font-bold">{telemetry.roll}°</span> | 
              Pitch: <span className="text-white font-bold">{telemetry.pitch}°</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          {isCritical && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-lg transition shadow-md shadow-rose-950/60 border border-rose-400/40 cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Alarm
            </button>
          )}
          {!isCritical && onTest && (
            <button
              onClick={onTest}
              className="px-3 py-1.5 bg-amber-600/60 hover:bg-amber-600 text-amber-100 text-xs rounded-lg transition border border-amber-400/40 cursor-pointer"
            >
              Test Alarm
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
