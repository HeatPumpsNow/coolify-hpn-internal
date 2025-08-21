'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva(
  'rounded-lg border bg-white',
  {
    variants: {
      variant: {
        default: 'border-gray-200 shadow-sm',
        elevated: 'border-gray-200 shadow-md hover:shadow-lg transition-shadow',
        outlined: 'border-gray-300',
        ghost: 'border-transparent'
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md'
    }
  }
);

export interface CardProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  hoverable?: boolean;
}

// React 19 pattern: ref as a regular prop
export function Card({ 
  className = '', 
  variant, 
  padding,
  header,
  footer,
  hoverable = false,
  children,
  ...props 
}: CardProps & { ref?: React.Ref<HTMLDivElement> }) {
  const ref = props.ref as React.Ref<HTMLDivElement>;
  const divProps = { ...props };
  delete divProps.ref;
  
  return (
    <div
      ref={ref}
      className={`
        ${cardVariants({ variant, padding: header || footer ? 'none' : padding })}
        ${hoverable ? 'hover:border-gray-300 transition-colors cursor-pointer' : ''}
        ${className}
      `}
      {...divProps}
    >
      {header && (
        <div className="border-b border-gray-200 px-4 py-3">
          {header}
        </div>
      )}
      
      <div className={header || footer ? cardVariants({ padding, variant: 'ghost' }) : ''}>
        {children}
      </div>
      
      {footer && (
        <div className="border-t border-gray-200 px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}

Card.displayName = 'Card';

// Card Header component for consistency
export function CardHeader({ 
  title, 
  subtitle,
  action,
  className = ''
}: { 
  title: string; 
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Additional Card components for shadcn/ui compatibility
export function CardTitle({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h3>
  );
}

export function CardDescription({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <p className={`text-sm text-muted-foreground ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`p-6 pt-0 ${className}`}>
      {children}
    </div>
  );
}

export function CardFooter({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`flex items-center p-6 pt-0 ${className}`}>
      {children}
    </div>
  );
}