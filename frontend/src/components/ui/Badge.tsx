import React from 'react';

interface BadgeProps { children: React.ReactNode; variant?: 'emerald' | 'amber' | 'blue' | 'purple' | 'slate' | 'rose'; size?: 'sm' | 'md'; className?: string; icon?: React.ReactNode; }

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'slate', size = 'md', className = '', icon }) => {
  const variantStyles = {
    emerald: 'bg-[#ecfdf3] text-[#087443] border-[#b7ebcc]',
    amber: 'bg-[#fff8e8] text-[#9a6500] border-[#f6d78b]',
    blue: 'bg-[#eef4fd] text-[#315b8d] border-[#c9d9ee]',
    purple: 'bg-[#fff1f1] text-[#b8171d] border-[#f2b9bb]',
    slate: 'bg-[#f3f5f7] text-[#66738a] border-[#dfe4ea]',
    rose: 'bg-[#fff1f1] text-[#b8171d] border-[#f2b9bb]',
  };
  const sizeStyles = { sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium', md: 'text-xs px-2.5 py-1 gap-1.5 font-medium' };
  return (
    <span className={`inline-flex items-center border rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}>
      {icon && <span className="shrink-0">{icon}</span>}{children}
    </span>
  );
};
