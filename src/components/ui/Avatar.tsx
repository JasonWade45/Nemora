'use client';

import React, { forwardRef } from 'react';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
}

const sizeStyles: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const shapeStyles: Record<NonNullable<AvatarProps['shape']>, string> = {
  circle: 'rounded-full',
  square: 'rounded-lg',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-pharma-500',
    'bg-success-500',
    'bg-warning-500',
    'bg-danger-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className = '', src, alt, name, size = 'md', shape = 'circle', ...props }, ref) => {
    const initials = name ? getInitials(name) : '?';
    const bgColor = name ? getColorFromName(name) : 'bg-slate-400';

    return (
      <div
        ref={ref}
        className={`
          inline-flex items-center justify-center font-medium text-white
          overflow-hidden bg-cover bg-center
          ${sizeStyles[size]} ${shapeStyles[shape]} ${className}
        `}
        {...props}
      >
        {src ? (
          <img src={src} alt={alt || name || 'Avatar'} className="w-full h-full object-cover" />
        ) : (
          <span className={bgColor}>{initials}</span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export const AvatarGroup = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { max?: number }>(
  ({ className = '', max = 5, children, ...props }, ref) => {
    const childArray = React.Children.toArray(children);
    const visibleChildren = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    return (
      <div ref={ref} className={`flex -space-x-2 ${className}`} {...props}>
        {visibleChildren.map((child, index) => {
          const el = child as React.ReactElement<{ className?: string }>;
          return React.cloneElement(el, {
            key: index,
            className: `ring-2 ring-white ${el.props.className || ''}`,
          });
        })}
        {remainingCount > 0 && (
          <div className="flex items-center justify-center w-10 h-10 text-xs font-medium text-slate-600 bg-slate-100 border-2 border-white rounded-full">
            +{remainingCount}
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = 'AvatarGroup';