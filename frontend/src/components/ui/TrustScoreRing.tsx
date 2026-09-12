import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface TrustScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TrustScoreRing: React.FC<TrustScoreRingProps> = ({
  score,
  size = 'md',
  showLabel = true,
}) => {
  const rounded = Math.round(score);

  const dimensions = {
    sm: { width: 44, stroke: 4, font: 'text-xs', iconSize: 12 },
    md: { width: 72, stroke: 6, font: 'text-base font-bold', iconSize: 16 },
    lg: { width: 110, stroke: 8, font: 'text-2xl font-bold', iconSize: 22 },
  };

  const { width, stroke, font } = dimensions[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(rounded / 100, 0), 1);
  const strokeDashoffset = circumference - progress * circumference;

  // Color selection
  let strokeColor = '#10b981'; // emerald
  let badgeColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (rounded < 75) {
    strokeColor = '#f59e0b'; // amber
    badgeColor = 'text-amber-700 bg-amber-50 border-amber-200';
  }
  if (rounded < 60) {
    strokeColor = '#ef4444'; // red
    badgeColor = 'text-rose-700 bg-rose-50 border-rose-200';
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative inline-flex items-center justify-center">
        <svg width={width} height={width} className="transform -rotate-90">
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={stroke}
            fill="transparent"
          />
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-slate-900 ${font}`}>{rounded}</span>
          {size === 'lg' && <span className="text-[10px] text-slate-400 -mt-1 font-medium">/ 100</span>}
        </div>
      </div>

      {showLabel && (
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${badgeColor}`}>
          <ShieldCheck className="w-3 h-3" />
          <span>Trust Score</span>
        </div>
      )}
    </div>
  );
};
