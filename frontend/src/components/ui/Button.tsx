import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children, variant = 'primary', size = 'md', loading = false, icon, className = '', disabled, ...props
}) => {
  const baseStyles = `theme-button theme-button--${variant} inline-flex items-center justify-center font-medium transition-colors duration-200 rounded-xl focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none active:translate-y-px motion-reduce:transform-none motion-reduce:transition-none`;
  const sizeStyles = { sm: 'min-h-10 text-xs px-3 py-1.5 gap-1.5', md: 'min-h-11 text-sm px-4 py-2 gap-2', lg: 'min-h-12 text-base px-6 py-2.5 gap-2.5' };
  return (
    <button className={`${baseStyles} ${sizeStyles[size]} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" /> : icon ? <span className="shrink-0" aria-hidden="true">{icon}</span> : null}
      {children}
    </button>
  );
};
