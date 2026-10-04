import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'whatsapp' | 'wave' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconRight,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 rounded-xl gap-1.5 font-semibold',
    md: 'text-sm px-4 py-2.5 rounded-xl gap-2 font-semibold',
    lg: 'text-sm px-5 py-3 rounded-2xl gap-2.5 font-bold tracking-tight shadow-sm',
  };

  const variantStyles = {
    primary:
      'bg-[#1E60F8] text-white hover:bg-[#164ED0] active:bg-[#0F3EB5] shadow-[0_2px_8px_rgba(30,96,248,0.25)] hover:shadow-[0_4px_12px_rgba(30,96,248,0.35)]',
    secondary:
      'bg-[#EFF4FF] text-[#1E60F8] hover:bg-[#DBEAFE] border border-[#BFDBFE]/40',
    outline:
      'bg-white border border-[#E2E8F0] text-[#0F172A] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]',
    ghost:
      'bg-transparent text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]',
    whatsapp:
      'bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold shadow-xs hover:shadow-sm',
    wave:
      'bg-[#1AA3FF] hover:bg-[#0E8FE8] text-white font-bold shadow-xs',
    orange:
      'bg-[#FF7900] hover:bg-[#E66D00] text-white font-bold shadow-xs',
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon && <span className="flex-shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
};
