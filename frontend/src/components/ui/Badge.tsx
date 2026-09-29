import React from 'react';

interface BadgeProps { children: React.ReactNode; variant?: 'emerald' | 'amber' | 'blue' | 'purple' | 'slate' | 'rose'; size?: 'sm' | 'md'; className?: string; icon?: React.ReactNode; }

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate', size = 'md', className = '', icon }) => {
  const sizeStyles = { sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium', md: 'text-xs px-2.5 py-1 gap-1.5 font-medium' };
  return (
    <span className={`theme-badge theme-badge--${variant} inline-flex items-center border rounded-full ${sizeStyles[size]} ${className}`}>
      {icon && <span className="shrink-0">{icon}</span>}{children}
    </span>
  );
};
