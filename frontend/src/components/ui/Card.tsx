import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div
      className={`group relative overflow-hidden rounded-[14px] border border-[#e1e5ea] bg-white text-[#17233b] shadow-[0_7px_22px_rgba(23,35,59,0.055)] ${
        hover ? 'transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d31d24]/30 hover:shadow-[0_12px_28px_rgba(23,35,59,0.09)]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
