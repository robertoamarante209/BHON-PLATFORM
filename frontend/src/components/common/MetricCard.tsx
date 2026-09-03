import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  delta?: {
    value: string;
    isPositive?: boolean;
  };
  highlight?: boolean;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  delta,
  highlight = false,
  className = '',
}) => {
  return (
    <div
      className={`bg-white border border-bhon-border p-3.5 rounded transition-colors ${
        highlight ? 'border-l-4 border-l-bhon-teal' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between text-xs text-bhon-muted font-medium mb-1">
        <span>{label}</span>
        {delta && (
          <span
            className={`font-mono-data text-[11px] font-semibold ${
              delta.isPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {delta.value}
          </span>
        )}
      </div>

      <div className="font-mono-data text-xl font-bold text-bhon-text tracking-tight">
        {value}
      </div>

      {subtext && (
        <div className="text-[11px] text-bhon-muted mt-1 leading-tight">
          {subtext}
        </div>
      )}
    </div>
  );
};
