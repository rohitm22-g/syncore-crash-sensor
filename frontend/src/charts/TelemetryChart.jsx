import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';

export function TelemetryChart({
  data = [],
  series = [],
  yLabel = '',
  height = 240,
  referenceLines = []
}) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1A2233" vertical={false} />
          <XAxis
            dataKey="time"
            stroke="#475569"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="#475569"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: '#1E293B' }}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0F131C',
              borderColor: '#26334D',
              borderRadius: '8px',
              color: '#F8FAFC',
              fontSize: '11px',
              fontFamily: 'monospace',
              boxShadow: '0 8px 16px rgba(0,0,0,0.5)'
            }}
            itemStyle={{ padding: '2px 0' }}
          />

          {referenceLines.map((ref, idx) => (
            <ReferenceLine
              key={idx}
              y={ref.value}
              stroke={ref.color || '#E11D48'}
              strokeDasharray="4 4"
              label={{
                value: ref.label,
                fill: ref.color || '#E11D48',
                fontSize: 9,
                position: 'right'
              }}
            />
          ))}

          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name || s.key}
              stroke={s.color}
              strokeWidth={s.strokeWidth || 1.8}
              dot={false}
              isAnimationActive={false} // Crucial for smooth real-time 10Hz streaming without jitter
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
