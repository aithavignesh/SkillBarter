import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1e2529] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-[#55a6c9] text-[#142027] font-semibold hover:bg-[#70b8d6] active:bg-[#427a93] shadow-[0_8px_24px_rgba(85,166,201,0.20)] focus:ring-[#55a6c9]',
    secondary: 'bg-[#2c3439] text-slate-100 border border-white/[0.09] hover:bg-[#374147] active:bg-[#414c52] focus:ring-[#55a6c9]',
    outline: 'border border-white/[0.14] text-slate-200 bg-transparent hover:bg-white/[0.05] hover:border-[#55a6c9]/55 active:bg-white/[0.08] focus:ring-[#55a6c9]',
    ghost: 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100 active:bg-white/[0.08] focus:ring-[#55a6c9]',
    danger: 'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 focus:ring-rose-500',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
};
