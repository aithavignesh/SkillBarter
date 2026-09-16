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
      className={`bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.05)] ${
        hover
          ? 'hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_16px_40px_rgba(15,23,42,0.09)] transition-all duration-200'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
