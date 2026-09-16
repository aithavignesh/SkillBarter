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
      className={`group relative overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#1e2529] text-slate-100 shadow-[0_18px_50px_rgba(0,0,0,0.24)] ${
        hover
          ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-[#55a6c9]/45 hover:bg-[#252d32] hover:shadow-[0_22px_55px_rgba(0,0,0,0.32)]'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
