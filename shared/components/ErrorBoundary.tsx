'use client';

/**
 * React Error Boundary Components
 * Provides graceful error handling for all React-based portals
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { UnifiedErrorBuilder, ErrorSeverity, Portal, ErrorFormatter } from '../errors/error-format';

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  traceId: string | null;
  isRetrying: boolean;
  retryCount: number;
}

/**
 * Error boundary props
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  portal: Portal;
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
  showDetails?: boolean;
}

/**
 * Main Error Boundary Component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;
  private previousResetKeys: Array<string | number> = [];
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      traceId: null,
      isRetrying: false,
      retryCount: 0
    };
    
    this.previousResetKeys = props.resetKeys || [];
  }
  
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Generate trace ID for this error
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build unified error
    const unifiedError = new UnifiedErrorBuilder(
      'REACT_ERROR_BOUNDARY',
      error.message
    )
      .withContext({
        portal: this.props.portal,
        traceId,
        requestId: errorId,
        environment: process.env.NODE_ENV as any
      })
      .withSeverity(this.getSeverityFromLevel())
      .withStack(error)
      .withDetails({
        componentStack: errorInfo.componentStack,
        level: this.props.level || 'component',
        retryCount: this.state.retryCount
      })
      .withUserMessage(this.getUserMessage())
      .withDeveloperMessage(`React Error Boundary caught error in ${this.props.portal} portal`)
      .withSuggestedActions(
        'Check the component that threw this error',
        'Review the error stack trace',
        'Verify props and state values'
      )
      .asOperational(false)
      .build();
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      ErrorFormatter.forConsole(unifiedError);
    }
    
    // Send to monitoring service
    this.reportError(unifiedError);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Update state with error details
    this.setState({
      errorInfo,
      errorId,
      traceId
    });
  }
  
  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;
    
    // Reset on prop changes if enabled
    if (hasError && prevProps.children !== this.props.children && resetOnPropsChange) {
      this.resetErrorBoundary();
    }
    
    // Reset if resetKeys changed
    if (hasError && resetKeys && this.hasResetKeyChanged(prevProps.resetKeys)) {
      this.resetErrorBoundary();
    }
  }
  
  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }
  
  private getSeverityFromLevel(): ErrorSeverity {
    switch (this.props.level) {
      case 'page':
        return ErrorSeverity.HIGH;
      case 'section':
        return ErrorSeverity.MEDIUM;
      default:
        return ErrorSeverity.LOW;
    }
  }
  
  private getUserMessage(): string {
    switch (this.props.level) {
      case 'page':
        return 'This page encountered an error. Please try refreshing or contact support if the problem persists.';
      case 'section':
        return 'This section is temporarily unavailable. Other parts of the application should work normally.';
      default:
        return 'A component error occurred. This feature may not work correctly.';
    }
  }
  
  private hasResetKeyChanged(prevResetKeys?: Array<string | number>): boolean {
    if (!prevResetKeys || !this.props.resetKeys) {
      return false;
    }
    
    return this.props.resetKeys.some(
      (key, index) => key !== prevResetKeys[index]
    );
  }
  
  private reportError(error: any): void {
    // Send error to monitoring endpoint
    if (typeof window !== 'undefined') {
      const endpoint = `/api/errors/report`;
      
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ErrorFormatter.forMonitoring(error))
      }).catch(err => {
        console.error('Failed to report error:', err);
      });
    }
  }
  
  private resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      traceId: null,
      isRetrying: false,
      retryCount: 0
    });
  };
  
  private handleRetry = (): void => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;
    
    if (retryCount < maxRetries) {
      this.setState({
        isRetrying: true,
        retryCount: retryCount + 1
      });
      
      // Reset after a short delay to show loading state
      this.resetTimeoutId = setTimeout(() => {
        this.resetErrorBoundary();
      }, 100);
    }
  };
  
  render(): ReactNode {
    const { hasError, error, errorInfo, errorId, traceId, isRetrying } = this.state;
    const { children, fallback, enableRetry = true, showDetails = false } = this.props;
    
    if (hasError && error && errorInfo) {
      // Custom fallback component
      if (typeof fallback === 'function') {
        return fallback(error, errorInfo, this.handleRetry);
      }
      
      // Custom fallback element
      if (fallback) {
        return fallback;
      }
      
      // Default fallback UI
      return (
        <ErrorFallback
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          traceId={traceId}
          onRetry={enableRetry ? this.handleRetry : undefined}
          isRetrying={isRetrying}
          level={this.props.level}
          showDetails={showDetails}
          portal={this.props.portal}
        />
      );
    }
    
    return children;
  }
}

/**
 * Default error fallback component
 */
interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  errorId: string | null;
  traceId: string | null;
  onRetry?: () => void;
  isRetrying: boolean;
  level?: 'page' | 'section' | 'component';
  showDetails: boolean;
  portal: Portal;
}

function ErrorFallback({
  error,
  errorInfo,
  errorId,
  traceId,
  onRetry,
  isRetrying,
  level = 'component',
  showDetails,
  portal
}: ErrorFallbackProps): JSX.Element {
  const [detailsExpanded, setDetailsExpanded] = React.useState(false);
  
  const containerClasses = {
    page: 'min-h-screen flex items-center justify-center p-8',
    section: 'p-8 my-8',
    component: 'p-4 my-4'
  };
  
  const iconSize = {
    page: 'w-16 h-16',
    section: 'w-12 h-12',
    component: 'w-8 h-8'
  };
  
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg ${containerClasses[level]}`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start space-x-4">
          {/* Error Icon */}
          <div className={`flex-shrink-0 ${iconSize[level]}`}>
            <svg
              className="w-full h-full text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          
          {/* Error Content */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900">
              {level === 'page' && 'Page Error'}
              {level === 'section' && 'Section Error'}
              {level === 'component' && 'Component Error'}
            </h3>
            
            <p className="mt-2 text-sm text-red-700">
              {level === 'page' && 'This page encountered an unexpected error.'}
              {level === 'section' && 'This section is temporarily unavailable.'}
              {level === 'component' && 'A component failed to render properly.'}
            </p>
            
            {/* Error IDs */}
            {(errorId || traceId) && (
              <div className="mt-3 text-xs text-red-600 space-y-1">
                {errorId && (
                  <div>
                    <span className="font-medium">Error ID:</span> {errorId}
                  </div>
                )}
                {traceId && (
                  <div>
                    <span className="font-medium">Trace ID:</span> {traceId}
                  </div>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="mt-4 flex items-center space-x-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </button>
              )}
              
              {level === 'page' && (
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-4 py-2 bg-white text-red-600 text-sm font-medium rounded-md border border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Go to Home
                </button>
              )}
              
              {showDetails && process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => setDetailsExpanded(!detailsExpanded)}
                  className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  {detailsExpanded ? 'Hide' : 'Show'} Details
                </button>
              )}
            </div>
            
            {/* Error Details (Development Only) */}
            {showDetails && detailsExpanded && process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-4 bg-gray-900 text-gray-100 rounded-md overflow-auto">
                <div className="text-xs font-mono space-y-2">
                  <div>
                    <span className="text-red-400">Portal:</span> {portal}
                  </div>
                  <div>
                    <span className="text-red-400">Error:</span> {error.toString()}
                  </div>
                  {error.stack && (
                    <div>
                      <span className="text-red-400">Stack:</span>
                      <pre className="mt-1 text-xs whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  {errorInfo.componentStack && (
                    <div>
                      <span className="text-red-400">Component Stack:</span>
                      <pre className="mt-1 text-xs whitespace-pre-wrap">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Async Error Boundary for handling async errors
 */
export function AsyncErrorBoundary({
  children,
  portal,
  ...props
}: ErrorBoundaryProps): JSX.Element {
  const [asyncError, setAsyncError] = React.useState<Error | null>(null);
  
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setAsyncError(new Error(event.reason));
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  
  if (asyncError) {
    throw asyncError;
  }
  
  return (
    <ErrorBoundary portal={portal} {...props}>
      {children}
    </ErrorBoundary>
  );
}

/**
 * Portal-specific error boundaries
 */
export const PortalErrorBoundary = {
  Admin: (props: Omit<ErrorBoundaryProps, 'portal'>) => (
    <ErrorBoundary {...props} portal={Portal.ADMIN} />
  ),
  Sales: (props: Omit<ErrorBoundaryProps, 'portal'>) => (
    <ErrorBoundary {...props} portal={Portal.SALES} />
  ),
  Customer: (props: Omit<ErrorBoundaryProps, 'portal'>) => (
    <ErrorBoundary {...props} portal={Portal.CUSTOMER} />
  ),
  Project: (props: Omit<ErrorBoundaryProps, 'portal'>) => (
    <ErrorBoundary {...props} portal={Portal.PROJECT} />
  ),
  Employee: (props: Omit<ErrorBoundaryProps, 'portal'>) => (
    <ErrorBoundary {...props} portal={Portal.EMPLOYEE} />
  ),
  Service: (props: Omit<ErrorBoundaryProps, 'portal'>) => (
    <ErrorBoundary {...props} portal={Portal.SERVICE} />
  ),
  Partner: (props: Omit<ErrorBoundaryProps, 'portal'>) => (
    <ErrorBoundary {...props} portal={Portal.PARTNER} />
  ),
  Analytics: (props: Omit<ErrorBoundaryProps, 'portal'>) => (
    <ErrorBoundary {...props} portal={Portal.ANALYTICS} />
  )
};

/**
 * HOC for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps: ErrorBoundaryProps
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default ErrorBoundary;