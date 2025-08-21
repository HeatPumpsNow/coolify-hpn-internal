'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-600',
        secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus-visible:ring-gray-400',
        success: 'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
        warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus-visible:ring-yellow-500',
        ghost: 'hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-400',
        link: 'text-blue-600 underline-offset-4 hover:underline focus-visible:ring-blue-600'
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
        xl: 'h-14 px-8 text-xl'
      },
      fullWidth: {
        true: 'w-full',
        false: ''
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// React 19 pattern: ref as a regular prop
export function Button({ 
  className = '', 
  variant, 
  size, 
  fullWidth,
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props 
}: ButtonProps & { ref?: React.Ref<HTMLButtonElement> }) {
  const ref = props.ref as React.Ref<HTMLButtonElement>;
  const buttonProps = { ...props };
  delete buttonProps.ref; // Remove ref from spreading
  
  return (
    <button
      ref={ref}
      className={`${buttonVariants({ variant, size, fullWidth })} ${className}`}
      disabled={disabled || isLoading}
      {...buttonProps}
    >
      {isLoading ? (
        <>
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </>
      ) : (
        <>
          {leftIcon && <span className="mr-2">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-2">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

Button.displayName = 'Button';

// For backward compatibility
export const ButtonWithRef = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => <Button {...props} ref={ref} />
);
ButtonWithRef.displayName = 'ButtonWithRef';