import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'blue' | 'purple' | 'slate' | 'rose';
  size?: 'sm' | 'md';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate', size = 'md', className = '', icon }) => {
  const variantStyles = {
    emerald: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
    amber: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
    blue: 'bg-sky-400/10 text-sky-300 border-sky-400/20',
    purple: 'bg-sky-400/10 text-sky-300 border-sky-400/20',
    slate: 'bg-white/[0.06] text-slate-300 border-white/[0.10]',
    rose: 'bg-rose-400/10 text-rose-300 border-rose-400/20',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  return (
    <span className={`inline-flex items-center border rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
