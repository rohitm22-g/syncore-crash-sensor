import React from 'react';
import {
  ShieldAlert,
  Activity,
  Layers,
  History,
  Settings,
  Radio,
  RotateCcw
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export function Navbar({
  activeTab,
  onTabChange,
  telemetry,
  connection,
  onResetAlarm
}) {
  const isAlarm = Boolean(telemetry?.alarm);
  const isDemo = connection?.source === 'DEMO';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'live-sensors', label: 'Live Sensor Monitoring', icon: Radio },
    { id: 'detection-events', label: 'Detection Events', icon: ShieldAlert },
    { id: 'event-history', label: 'Event History', icon: History },
    { id: 'device-settings', label: 'Device Settings', icon: Settings }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0B0E14]/95 backdrop-blur-md">
      {/* Top Telemetry & Status Ticker */}
      <div className="border-b border-slate-800/50 bg-[#080B10] px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400">STATUS:</span>
              <StatusBadge
                type={telemetry?.status === 'MONITORING' ? 'monitoring' : 'standby'}
                label={telemetry?.status || 'MONITORING'}
                size="sm"
              />
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <span className="text-slate-400">ALARM:</span>
              <StatusBadge
                type={isAlarm ? 'alarm' : 'normal'}
                label={isAlarm ? 'ALARM ACTIVE' : 'NORMAL'}
                size="sm"
              />
            </div>

            <div className="hidden sm:flex items-center gap-1.5 font-mono">
              <span className="text-slate-400">DATA SOURCE:</span>
              {isDemo ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300">
                  DEMO MODE (SIMULATED)
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-emerald-300">
                  ESP32 HARDWARE SERIAL
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
            <span className="hidden md:inline">
              ACCEL: <strong className="text-slate-200">{telemetry?.linear_accel ?? '0.00'} G</strong>
            </span>
            <span className="hidden md:inline">
              GYRO: <strong className="text-slate-200">{telemetry?.gyro ?? '0.0'} °/s</strong>
            </span>
            <span className="hidden lg:inline">
              ROLL: <strong className="text-slate-200">{telemetry?.roll ?? '0.0'}°</strong>
            </span>
            {isAlarm && (
              <button
                onClick={onResetAlarm}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs transition cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Alarm
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-950/40 border border-cyan-400/40">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white font-mono">
                  SYNCORE
                </span>
                <span className="text-[10px] uppercase font-mono tracking-widest text-cyan-400 border border-cyan-500/30 bg-cyan-950/30 px-1.5 py-0.2 rounded">
                  v1.0-EXP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-tight hidden sm:block">
                Intelligent Crash Detection & Monitoring System
              </p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
