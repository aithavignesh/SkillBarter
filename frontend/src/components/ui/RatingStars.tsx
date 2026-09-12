import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  value: number;
  onChange?: (val: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  value,
  onChange,
  max = 5,
  size = 'md',
  showScore = false,
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  const isInteractive = Boolean(onChange);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {Array.from({ length: max }).map((_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= Math.round(value);

          return (
            <button
              key={index}
              type="button"
              disabled={!isInteractive}
              onClick={() => onChange && onChange(starValue)}
              className={`p-0.5 transition-transform ${
                isInteractive ? 'hover:scale-125 cursor-pointer focus:outline-none' : 'cursor-default'
              }`}
            >
              <Star
                className={`${sizeClasses[size]} ${
                  isFilled
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-300 fill-slate-100'
                }`}
              />
            </button>
          );
        })}
      </div>
      {showScore && (
        <span className="text-xs font-semibold text-slate-700 ml-1">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
};
