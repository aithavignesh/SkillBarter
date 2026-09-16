import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  ...props
}) => {
  return (
    <div
      className={`group relative overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.055)] ${
        hover
          ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300/70 hover:shadow-[0_18px_45px_rgba(15,23,42,0.10)]'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
