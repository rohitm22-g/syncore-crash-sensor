import React from 'react';
import { Navbar } from '../components/Navbar';
import { ShieldAlert, Cpu } from 'lucide-react';

export function MainLayout({
  activeTab,
  onTabChange,
  telemetry,
  connection,
  onResetAlarm,
  children
}) {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar
        activeTab={activeTab}
        onTabChange={onTabChange}
        telemetry={telemetry}
        connection={connection}
        onResetAlarm={onResetAlarm}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-slate-800/80 bg-[#080B10] py-4 text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-semibold">SYNCORE</span>
            <span className="text-slate-500">|</span>
            <span>Intelligent Crash Detection & Monitoring System</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Hardware Target: ESP32 + MPU6050 6-DoF</span>
            <span>•</span>
            <span>Firmware Rate: 100 Hz / Telemetry Stream: 10 Hz</span>
            <span>•</span>
            <span className="text-cyan-400">Educational IoT Prototype</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
