import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  value: number;
  onChange?: (val: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  value,
  onChange,
  max = 5,
  size = 'md',
  showScore = false,
  ariaLabel = 'Rating',
  disabled = false,
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  const isInteractive = Boolean(onChange) && !disabled;

  return (
    <div className="flex items-center gap-1" role="group" aria-label={ariaLabel}>
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
              aria-label={isInteractive ? `Rate ${starValue} out of ${max} stars` : undefined}
              aria-pressed={isInteractive ? starValue === Math.round(value) : undefined}
              className={`inline-flex min-h-10 min-w-10 items-center justify-center rounded-md p-0.5 transition-colors duration-200 motion-reduce:transition-none ${
                isInteractive ? 'cursor-pointer hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#d31d24]' : disabled ? 'cursor-not-allowed opacity-60' : 'cursor-default'
              }`}
            >
              <Star
                className={`${sizeClasses[size]} ${
                  isFilled
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-slate-300 fill-slate-100'
                }`}
                aria-hidden="true"
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
