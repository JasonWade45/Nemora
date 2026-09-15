'use client';

import React, { forwardRef } from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-100 text-danger-700',
  info: 'bg-pharma-100 text-pharma-700',
  outline: 'bg-transparent border border-slate-300 text-slate-700',
};

const sizeStyles: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1 text-base',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', size = 'md', dot = false, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center gap-1.5 font-medium rounded-full
          ${variantStyles[variant]} ${sizeStyles[size]} ${className}
        `}
        {...props}
      >
        {dot && (
          <span className={`
            w-1.5 h-1.5 rounded-full
            ${variant === 'success' ? 'bg-success-500' :
              variant === 'warning' ? 'bg-warning-500' :
              variant === 'danger' ? 'bg-danger-500' :
              variant === 'info' ? 'bg-pharma-500' : 'bg-slate-500'}
          `} />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';