import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'info' | 'pink' | 'neutral' | 'outline';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-bold',
    md: 'text-xs px-2.5 py-0.5 font-bold tracking-tight',
  };

  const variantStyles = {
    primary: 'bg-[#EFF4FF] text-[#1E60F8] border border-[#BFDBFE]/60',
    success: 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]/60',
    warning: 'bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]/60',
    info: 'bg-[#F0F9FF] text-[#0284C7] border border-[#BAE6FD]/60',
    pink: 'bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]/60',
    neutral: 'bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]',
    outline: 'border border-[#CBD5E1] text-[#475569] bg-white',
  };

  const dotColors = {
    primary: 'bg-[#1E60F8]',
    success: 'bg-[#10B981]',
    warning: 'bg-[#F59E0B]',
    info: 'bg-[#0EA5E9]',
    pink: 'bg-[#F43F5E]',
    neutral: 'bg-[#94A3B8]',
    outline: 'bg-[#64748B]',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse ${dotColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
};
