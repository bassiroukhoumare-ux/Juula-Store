import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, icon, iconRight, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold tracking-wider uppercase text-[#1A1A1A]/80"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-[#737373] pointer-events-none flex items-center">
              {icon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`
              w-full rounded-xl bg-white/95 px-4 py-3 text-sm text-[#1A1A1A]
              border border-[#DED8C4] placeholder:text-[#9CA3AF]
              focus:outline-none focus:border-[#3D0B37] focus:ring-2 focus:ring-[#3D0B37]/15
              transition-all duration-150
              ${icon ? 'pl-10' : ''}
              ${iconRight ? 'pr-10' : ''}
              ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''}
              ${className}
            `}
            {...props}
          />
          {iconRight && (
            <div className="absolute right-3.5 text-[#737373] flex items-center">
              {iconRight}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-[#737373]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
