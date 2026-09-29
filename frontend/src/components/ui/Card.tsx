import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, ...props }) => {
  return (
    <div
      className={`theme-card group relative min-w-0 overflow-hidden rounded-[10px] border ${hover ? 'theme-card--interactive' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
