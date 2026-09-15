'use client';

import React, { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  asChild?: boolean;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-pharma-600 text-white hover:bg-pharma-700 active:bg-pharma-800',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300',
  outline: 'border border-slate-300 bg-transparent hover:bg-slate-50 active:bg-slate-100',
  ghost: 'bg-transparent hover:bg-slate-100 active:bg-slate-200',
  danger: 'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
  icon: 'p-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading = false, disabled, asChild = false, children, ...props }, ref) => {
    const buttonClassName = `
          inline-flex items-center justify-center font-medium rounded-lg transition-colors
          focus:outline-none focus:ring-2 focus:ring-pharma-500 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          touch-target
          ${variantStyles[variant]} ${sizeStyles[size]} ${className}
        `;

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: `${buttonClassName} ${child.props.className ?? ''}`.trim(),
      });
    }

    return (
      <button
        ref={ref}
        className={buttonClassName}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';