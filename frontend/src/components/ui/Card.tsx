import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div
      className={`group relative overflow-hidden rounded-[10px] border border-[#e1e4e8] bg-white text-[#17233b] ${hover ? 'transition-colors duration-200 hover:border-[#cfd4db] hover:bg-[#fefefe]' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
