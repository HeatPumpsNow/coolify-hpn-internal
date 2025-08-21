'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const inputVariants = cva(
  'flex w-full rounded-md border bg-white px-3 py-2 text-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-gray-300 focus-visible:ring-blue-600',
        error: 'border-red-500 focus-visible:ring-red-600',
        success: 'border-green-500 focus-visible:ring-green-600',
        warning: 'border-yellow-500 focus-visible:ring-yellow-600'
      },
      inputSize: {
        sm: 'h-8 text-xs',
        md: 'h-10 text-sm',
        lg: 'h-12 text-base',
        xl: 'h-14 text-lg'
      }
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md'
    }
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

// React 19 pattern: ref as a regular prop
export function Input({ 
  className = '', 
  variant, 
  inputSize,
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  id,
  ...props 
}: InputProps & { ref?: React.Ref<HTMLInputElement> }) {
  const ref = props.ref as React.Ref<HTMLInputElement>;
  const inputProps = { ...props };
  delete inputProps.ref; // Remove ref from spreading to input
  
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorVariant = error ? 'error' : variant;

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={`
            ${inputVariants({ variant: errorVariant, inputSize })} 
            ${leftIcon ? 'pl-10' : ''} 
            ${rightIcon ? 'pr-10' : ''} 
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...inputProps}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
}

Input.displayName = 'Input';

// For backward compatibility, also export with forwardRef 
export const InputWithRef = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => <Input {...props} ref={ref} />
);
InputWithRef.displayName = 'InputWithRef';