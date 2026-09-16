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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0b1015] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-2.5 gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-sky-500 text-[#07131a] font-semibold hover:bg-sky-400 active:bg-sky-600 shadow-[0_8px_24px_rgba(56,189,248,0.22)] focus:ring-sky-400',
    secondary: 'bg-[#29323a] text-slate-100 border border-white/[0.08] hover:bg-[#333e47] active:bg-[#3b4750] focus:ring-sky-400',
    outline: 'border border-white/[0.14] text-slate-200 bg-transparent hover:bg-white/[0.05] hover:border-sky-400/50 active:bg-white/[0.08] focus:ring-sky-400',
    ghost: 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100 active:bg-white/[0.08] focus:ring-sky-400',
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
