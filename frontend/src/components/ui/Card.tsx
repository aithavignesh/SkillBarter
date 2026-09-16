import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div
      className={`group relative overflow-hidden rounded-[10px] border border-[#e1e4e8] bg-white text-[#17233b] shadow-[0_2px_10px_rgba(23,35,59,0.035)] ${hover ? 'transition-all duration-200 hover:-translate-y-px hover:border-[#d5d9de] hover:shadow-[0_6px_18px_rgba(23,35,59,0.055)]' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
