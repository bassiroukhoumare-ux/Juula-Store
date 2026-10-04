import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'flat' | 'highlight' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'lg',
  hoverEffect = false,
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-7',
    xl: 'p-7 sm:p-8',
  };

  const variantStyles = {
    default: 'bg-white border border-[#E5E9F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)]',
    flat: 'bg-[#F8FAFC] border border-[#E2E8F0]',
    highlight: 'bg-gradient-to-br from-[#1E60F8] to-[#164ED0] text-white border border-[#1E60F8] shadow-md',
    subtle: 'bg-white/80 backdrop-blur-md border border-[#E2E8F0]',
  };

  return (
    <div
      className={`
        rounded-2xl sm:rounded-3xl
        transition-all duration-200
        ${paddingStyles[padding]}
        ${variantStyles[variant]}
        ${hoverEffect ? 'hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:border-[#CBD5E1]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
