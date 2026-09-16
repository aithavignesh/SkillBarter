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
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#f7f8fa] disabled:opacity-50 disabled:cursor-not-allowed select-none';
  const sizeStyles = { sm: 'text-xs px-3 py-1.5 gap-1.5', md: 'text-sm px-4 py-2 gap-2', lg: 'text-base px-6 py-2.5 gap-2.5' };
  const variantStyles = {
    primary: 'bg-[#d31d24] text-white font-semibold hover:bg-[#b8171d] active:bg-[#a91319] shadow-[0_7px_18px_rgba(211,29,36,0.18)] focus:ring-[#d31d24]',
    secondary: 'bg-white text-[#17233b] border border-[#dfe4ea] hover:bg-[#f7f8fa] active:bg-[#eef1f5] focus:ring-[#d31d24]',
    outline: 'border border-[#d9dfe7] text-[#17233b] bg-white hover:bg-[#fff5f5] hover:border-[#d31d24]/40 active:bg-[#fff0f0] focus:ring-[#d31d24]',
    ghost: 'text-[#66738a] hover:bg-[#f5f7fa] hover:text-[#17233b] active:bg-[#eef1f5] focus:ring-[#d31d24]',
    danger: 'bg-[#d31d24] text-white hover:bg-[#b8171d] active:bg-[#a91319] focus:ring-[#d31d24]',
  };
  return (
    <button className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
};
