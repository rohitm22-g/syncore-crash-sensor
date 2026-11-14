import React from 'react';

/**
 * StatusBadge
 * Color rules:
 * - Green: Normal monitoring
 * - Yellow: Warning or unusual readings
 * - Red: Alarm activated
 * - Grey: Device disconnected or unavailable
 */
export function StatusBadge({ type, label, size = 'md' }) {
  const getStyles = () => {
    switch (type) {
      case 'normal':
      case 'green':
      case 'monitoring':
        return {
          bg: 'bg-emerald-950/60',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400',
          dot: 'bg-emerald-400'
        };
      case 'warning':
      case 'yellow':
        return {
          bg: 'bg-amber-950/60',
          border: 'border-amber-500/40',
          text: 'text-amber-400',
          dot: 'bg-amber-400'
        };
      case 'alarm':
      case 'red':
      case 'danger':
        return {
          bg: 'bg-rose-950/80',
          border: 'border-rose-500/60',
          text: 'text-rose-300 font-semibold',
          dot: 'bg-rose-400 animate-pulse'
        };
      case 'disconnected':
      case 'grey':
      case 'standby':
      default:
        return {
          bg: 'bg-slate-800/60',
          border: 'border-slate-700/60',
          text: 'text-slate-400',
          dot: 'bg-slate-500'
        };
    }
  };

  const style = getStyles();
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs tracking-wider';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${style.bg} ${style.border} ${style.text} ${sizeClasses} uppercase font-medium select-none`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}
