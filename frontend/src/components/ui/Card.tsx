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
      className={`group relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#171d23] text-slate-100 shadow-[0_18px_50px_rgba(0,0,0,0.24)] ${
        hover
          ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/35 hover:bg-[#1b2229] hover:shadow-[0_22px_55px_rgba(0,0,0,0.32)]'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
