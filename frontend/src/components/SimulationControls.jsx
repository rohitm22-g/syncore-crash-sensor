import React, { useState } from 'react';
import { Play, Zap, RotateCcw, AlertTriangle, ShieldAlert, SlidersHorizontal, Activity } from 'lucide-react';

export function SimulationControls({
  onTriggerScenario,
  onResetAlarm,
  onManualAlarmTest,
  isAlarm,
  dataSource,
  onToggleDataSource
}) {
  const [activeScenario, setActiveScenario] = useState('normal');

  const handleScenario = (name) => {
    setActiveScenario(name);
    onTriggerScenario(name);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#121622]/90 p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-200 tracking-tight">
                Simulated Sensor Telemetry Generator
              </h4>
              <span className="text-[10px] font-mono uppercase bg-amber-950/80 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded font-bold">
                DEMO MODE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Inject synthetic MPU6050 kinematic events to validate detection thresholds & alarm logic.
            </p>
          </div>
        </div>

        {/* Live / Demo Mode switch */}
        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => onToggleDataSource('DEMO')}
            className={`px-2.5 py-1 text-xs font-mono rounded transition cursor-pointer ${
              dataSource === 'DEMO'
                ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            DEMO
          </button>
          <button
            onClick={() => onToggleDataSource('LIVE')}
            className={`px-2.5 py-1 text-xs font-mono rounded transition cursor-pointer ${
              dataSource === 'LIVE'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            LIVE ESP32
          </button>
        </div>
      </div>

      {/* Scenario Trigger Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3.5">
        <button
          onClick={() => handleScenario('normal')}
          className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
            activeScenario === 'normal' && !isAlarm
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-black/30 border-slate-800 text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Play className="w-4 h-4 mb-1 text-emerald-400" />
          <span>Normal Motion</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5">0.1 - 0.3 G</span>
        </button>

        <button
          onClick={() => handleScenario('braking')}
          className="flex flex-col items-center justify-center p-2.5 rounded-lg border bg-black/30 border-slate-800 text-slate-300 hover:bg-slate-800/50 text-xs font-medium transition cursor-pointer"
        >
          <Activity className="w-4 h-4 mb-1 text-sky-400" />
          <span>Hard Braking</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5">Pitch dip (-6°)</span>
        </button>

        <button
          onClick={() => handleScenario('spike')}
          className="flex flex-col items-center justify-center p-2.5 rounded-lg border bg-black/30 border-slate-800 text-slate-300 hover:bg-slate-800/50 text-xs font-medium transition cursor-pointer"
        >
          <Zap className="w-4 h-4 mb-1 text-amber-400" />
          <span>Sudden Movement</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5">Spike (&gt; 2.8 G)</span>
        </button>

        <button
          onClick={() => handleScenario('tilt')}
          className="flex flex-col items-center justify-center p-2.5 rounded-lg border bg-black/30 border-slate-800 text-slate-300 hover:bg-slate-800/50 text-xs font-medium transition cursor-pointer"
        >
          <AlertTriangle className="w-4 h-4 mb-1 text-amber-400" />
          <span>Excessive Tilt</span>
          <span className="text-[10px] text-slate-500 font-mono mt-0.5">Roll (&gt; 50°)</span>
        </button>

        <button
          onClick={() => handleScenario('crash')}
          className="flex flex-col items-center justify-center p-2.5 rounded-lg border bg-rose-950/30 border-rose-500/40 text-rose-300 hover:bg-rose-950/60 text-xs font-medium transition cursor-pointer shadow-sm"
        >
          <ShieldAlert className="w-4 h-4 mb-1 text-rose-400 animate-pulse" />
          <span>Simulate Impact</span>
          <span className="text-[10px] text-rose-400/80 font-mono mt-0.5">5.2 G + Rollover</span>
        </button>

        <button
          onClick={isAlarm ? onResetAlarm : onManualAlarmTest}
          className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
            isAlarm
              ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400'
              : 'bg-black/30 border-slate-800 text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <RotateCcw className="w-4 h-4 mb-1 text-slate-200" />
          <span>{isAlarm ? 'Reset Alarm' : 'Manual Test'}</span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            {isAlarm ? 'Clear system' : 'Test siren'}
          </span>
        </button>
      </div>
    </div>
  );
}
