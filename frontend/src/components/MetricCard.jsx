import React from 'react';

export function MetricCard({
  title,
  value,
  unit,
  status = 'normal',
  subtitle,
  icon: Icon,
  details = [],
  highlightValue = false
}) {
  const getStatusBorder = () => {
    switch (status) {
      case 'alarm':
      case 'red':
        return 'border-rose-500/60 bg-rose-950/20 shadow-rose-950/30';
      case 'warning':
      case 'yellow':
        return 'border-amber-500/50 bg-amber-950/20 shadow-amber-950/20';
      case 'normal':
      case 'green':
        return 'border-emerald-500/30 bg-[#121722]/80 hover:border-emerald-500/50';
      default:
        return 'border-slate-800 bg-[#10141E]/90';
    }
  };

  return (
    <div
      className={`relative rounded-xl border p-4.5 transition-all duration-200 shadow-sm backdrop-blur-sm ${getStatusBorder()}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          {title}
        </span>
        {subtitle && (
          <span className="text-[11px] text-slate-500 font-mono tracking-tight">
            {subtitle}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 my-1">
        <span
          className={`text-3xl font-bold font-mono tracking-tight ${
            status === 'alarm'
              ? 'text-rose-400'
              : status === 'warning'
              ? 'text-amber-400'
              : highlightValue
              ? 'text-cyan-400'
              : 'text-slate-100'
          }`}
        >
          {typeof value === 'number' ? value.toFixed(2) : value}
        </span>
        {unit && <span className="text-xs text-slate-400 font-mono font-medium">{unit}</span>}
      </div>

      {details.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
          {details.map((d, idx) => (
            <div key={idx} className="bg-black/30 rounded px-1.5 py-1 border border-white/5">
              <span className="text-[10px] text-slate-500 font-mono block uppercase">
                {d.label}
              </span>
              <span className="text-xs font-mono font-medium text-slate-300">
                {typeof d.value === 'number' ? d.value.toFixed(2) : d.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
