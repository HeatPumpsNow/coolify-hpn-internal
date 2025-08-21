// Simple logger utility using the shared logger
import { log, logger, createLogger, LogLevel } from '@/shared/utils';

// Re-export the shared logger utilities
export { log, logger, createLogger, LogLevel };

// Default logger instance
export default logger;