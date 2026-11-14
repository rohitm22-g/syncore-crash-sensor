import React from 'react';
import { Compass } from 'lucide-react';

export function AttitudeIndicator({ roll = 0, pitch = 0, tiltAlert = false, threshold = 45 }) {
  // Clamped pitch offset for visual presentation (-40 to +40 pixels)
  const pitchOffset = Math.max(-40, Math.min(40, pitch * 1.5));
  // Roll rotation in degrees
  const rollRotation = roll;

  const isExcessiveTilt = Math.abs(roll) > threshold || tiltAlert;

  return (
    <div className="relative rounded-xl border border-slate-800 bg-[#10141E]/90 p-4 flex flex-col items-center justify-between shadow-sm">
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-xs uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          Orientation & Attitude (MPU6050)
        </span>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-medium ${
            isExcessiveTilt
              ? 'bg-rose-950/70 text-rose-300 border-rose-500/50 animate-pulse'
              : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {isExcessiveTilt ? 'Tilt Boundary Exceeded' : 'Level Stable'}
        </span>
      </div>

      {/* Artificial Horizon Sphere */}
      <div className="relative w-44 h-44 rounded-full border-2 border-slate-700/80 overflow-hidden bg-slate-900 shadow-inner flex items-center justify-center my-2">
        {/* Dynamic Horizon Disk */}
        <div
          className="absolute w-72 h-72 transition-transform duration-75 ease-out"
          style={{
            transform: `translateY(${pitchOffset}px) rotate(${rollRotation}deg)`
          }}
        >
          {/* Sky (Top half) */}
          <div className="w-full h-1/2 bg-gradient-to-b from-sky-950/90 to-sky-800/80 border-b border-cyan-300/80" />
          {/* Ground (Bottom half) */}
          <div className="w-full h-1/2 bg-gradient-to-b from-amber-950/90 to-stone-900" />

          {/* Pitch Ladder lines */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-[8px] font-mono text-cyan-200/60">
            <div className="w-12 h-[1px] bg-cyan-300/40 my-3" />
            <div className="w-20 h-[1.5px] bg-white my-0 shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            <div className="w-12 h-[1px] bg-amber-400/40 my-3" />
          </div>
        </div>

        {/* Static Central Reticle / Fixed Vehicle Crosshair */}
        <div className="absolute z-10 pointer-events-none flex items-center justify-center">
          <div className="w-7 h-[2px] bg-amber-400 rounded-sm shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          <div className="w-2.5 h-2.5 rounded-full border-2 border-amber-400 mx-1 bg-transparent" />
          <div className="w-7 h-[2px] bg-amber-400 rounded-sm shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        </div>

        {/* Bank Angle Roll Scale Markers (Top dial) */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-2 bg-white rounded-b-sm" />
          {/* 45 degree tilt threshold ticks */}
          <div
            className="absolute top-2 left-1/2 w-0.5 h-2 bg-rose-500 origin-bottom"
            style={{ transform: 'translateX(-50%) rotate(45deg) translateY(-80px)' }}
          />
          <div
            className="absolute top-2 left-1/2 w-0.5 h-2 bg-rose-500 origin-bottom"
            style={{ transform: 'translateX(-50%) rotate(-45deg) translateY(-80px)' }}
          />
        </div>
      </div>

      {/* Digital Readout Bar */}
      <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80">
        <div className="bg-black/40 rounded px-2.5 py-1.5 border border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">ROLL:</span>
          <span
            className={`font-mono text-sm font-bold ${
              Math.abs(roll) > threshold ? 'text-rose-400' : 'text-slate-200'
            }`}
          >
            {roll > 0 ? `+${roll.toFixed(1)}` : roll.toFixed(1)}°
          </span>
        </div>
        <div className="bg-black/40 rounded px-2.5 py-1.5 border border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">PITCH:</span>
          <span className="font-mono text-sm font-bold text-slate-200">
            {pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)}°
          </span>
        </div>
      </div>
    </div>
  );
}
