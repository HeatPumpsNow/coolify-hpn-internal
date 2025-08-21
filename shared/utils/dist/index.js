"use strict";
// Shared utility functions for Heat Pumps Now applications
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.ROLES = exports.HTTP_STATUS = exports.UUID_REGEX = exports.EMAIL_REGEX = exports.PHONE_REGEX = exports.isDate = exports.isArray = exports.isObject = exports.isBoolean = exports.isNumber = exports.isString = exports.isTest = exports.isDevelopment = exports.isProduction = exports.getEnvVar = exports.retry = exports.sleep = exports.isError = exports.createError = exports.parseQueryString = exports.buildUrl = exports.isImageFile = exports.formatFileSize = exports.getFileName = exports.getFileExtension = exports.isEmpty = exports.omit = exports.pick = exports.sortBy = exports.groupBy = exports.unique = exports.chunk = exports.formatRelativeTime = exports.formatDateTime = exports.formatDate = exports.roundToDecimal = exports.formatNumber = exports.formatCurrency = exports.truncate = exports.slugify = exports.capitalizeWords = exports.capitalize = exports.validatePassword = exports.validatePhone = exports.validateEmail = exports.verifyToken = exports.generateToken = exports.comparePassword = exports.hashPassword = void 0;
exports.log = exports.createLogger = exports.logger = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const validator_1 = __importDefault(require("validator"));
const date_fns_1 = require("date-fns");
// Password utilities
const hashPassword = async (password) => {
    const saltRounds = 12;
    return bcryptjs_1.default.hash(password, saltRounds);
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hash) => {
    return bcryptjs_1.default.compare(password, hash);
};
exports.comparePassword = comparePassword;
// JWT utilities
const generateToken = (payload, secret, expiresIn = '7d') => {
    if (!secret) {
        throw new Error('JWT secret is required');
    }
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn });
};
exports.generateToken = generateToken;
const verifyToken = (token, secret) => {
    if (!secret) {
        throw new Error('JWT secret is required');
    }
    return jsonwebtoken_1.default.verify(token, secret);
};
exports.verifyToken = verifyToken;
// Validation utilities
const validateEmail = (email) => {
    return validator_1.default.isEmail(email);
};
exports.validateEmail = validateEmail;
const validatePhone = (phone) => {
    // US phone number validation
    const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};
exports.validatePhone = validatePhone;
const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
exports.validatePassword = validatePassword;
// String utilities
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
exports.capitalize = capitalize;
const capitalizeWords = (str) => {
    return str.split(' ').map(exports.capitalize).join(' ');
};
exports.capitalizeWords = capitalizeWords;
const slugify = (str) => {
    return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
};
exports.slugify = slugify;
const truncate = (str, maxLength, suffix = '...') => {
    if (str.length <= maxLength)
        return str;
    return str.substring(0, maxLength - suffix.length) + suffix;
};
exports.truncate = truncate;
// Number utilities
const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
    }).format(amount);
};
exports.formatCurrency = formatCurrency;
const formatNumber = (num, locale = 'en-US') => {
    return new Intl.NumberFormat(locale).format(num);
};
exports.formatNumber = formatNumber;
const roundToDecimal = (num, decimals = 2) => {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};
exports.roundToDecimal = roundToDecimal;
// Date utilities
const formatDate = (date, dateFormat = 'yyyy-MM-dd') => {
    const parsedDate = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : date;
    if (!(0, date_fns_1.isValid)(parsedDate)) {
        throw new Error('Invalid date provided');
    }
    return (0, date_fns_1.format)(parsedDate, dateFormat);
};
exports.formatDate = formatDate;
const formatDateTime = (date, dateFormat = 'yyyy-MM-dd HH:mm') => {
    return (0, exports.formatDate)(date, dateFormat);
};
exports.formatDateTime = formatDateTime;
const formatRelativeTime = (date) => {
    const parsedDate = typeof date === 'string' ? (0, date_fns_1.parseISO)(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - parsedDate.getTime()) / 1000);
    if (diffInSeconds < 60)
        return 'just now';
    if (diffInSeconds < 3600)
        return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400)
        return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000)
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000)
        return `${Math.floor(diffInSeconds / 2592000)} months ago`;
    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
};
exports.formatRelativeTime = formatRelativeTime;
// Array utilities
const chunk = (array, size) => {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
};
exports.chunk = chunk;
const unique = (array) => {
    return [...new Set(array)];
};
exports.unique = unique;
const groupBy = (array, key) => {
    return array.reduce((groups, item) => {
        const group = String(item[key]);
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(item);
        return groups;
    }, {});
};
exports.groupBy = groupBy;
const sortBy = (array, key, order = 'asc') => {
    return array.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal)
            return order === 'asc' ? -1 : 1;
        if (aVal > bVal)
            return order === 'asc' ? 1 : -1;
        return 0;
    });
};
exports.sortBy = sortBy;
// Object utilities
const pick = (obj, keys) => {
    const result = {};
    for (const key of keys) {
        if (key in obj) {
            result[key] = obj[key];
        }
    }
    return result;
};
exports.pick = pick;
const omit = (obj, keys) => {
    const result = { ...obj };
    for (const key of keys) {
        delete result[key];
    }
    return result;
};
exports.omit = omit;
const isEmpty = (obj) => {
    if (obj == null)
        return true;
    if (Array.isArray(obj) || typeof obj === 'string')
        return obj.length === 0;
    if (obj instanceof Map || obj instanceof Set)
        return obj.size === 0;
    return Object.keys(obj).length === 0;
};
exports.isEmpty = isEmpty;
// File utilities
const getFileExtension = (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};
exports.getFileExtension = getFileExtension;
const getFileName = (filename) => {
    return filename.substring(0, filename.lastIndexOf('.')) || filename;
};
exports.getFileName = getFileName;
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
exports.formatFileSize = formatFileSize;
const isImageFile = (filename) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const ext = (0, exports.getFileExtension)(filename).toLowerCase();
    return imageExtensions.includes(`.${ext}`);
};
exports.isImageFile = isImageFile;
// URL utilities
const buildUrl = (baseUrl, path, params) => {
    const url = new URL(path, baseUrl);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
    }
    return url.toString();
};
exports.buildUrl = buildUrl;
const parseQueryString = (queryString) => {
    const params = new URLSearchParams(queryString);
    const result = {};
    for (const [key, value] of params) {
        result[key] = value;
    }
    return result;
};
exports.parseQueryString = parseQueryString;
// Error utilities
const createError = (message, code, details) => {
    const error = new Error(message);
    if (code)
        error.code = code;
    if (details)
        error.details = details;
    return error;
};
exports.createError = createError;
const isError = (value) => {
    return value instanceof Error;
};
exports.isError = isError;
// Async utilities
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
const retry = async (fn, attempts = 3, delay = 1000) => {
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        }
        catch (error) {
            if (i === attempts - 1)
                throw error;
            await (0, exports.sleep)(delay * Math.pow(2, i)); // Exponential backoff
        }
    }
    throw new Error('Retry attempts exhausted');
};
exports.retry = retry;
// Environment utilities
const getEnvVar = (name, defaultValue) => {
    const value = process.env[name];
    if (value === undefined) {
        if (defaultValue !== undefined)
            return defaultValue;
        throw new Error(`Environment variable ${name} is required`);
    }
    return value;
};
exports.getEnvVar = getEnvVar;
const isProduction = () => {
    return process.env.NODE_ENV === 'production';
};
exports.isProduction = isProduction;
const isDevelopment = () => {
    return process.env.NODE_ENV === 'development';
};
exports.isDevelopment = isDevelopment;
const isTest = () => {
    return process.env.NODE_ENV === 'test';
};
exports.isTest = isTest;
// Type guards
const isString = (value) => {
    return typeof value === 'string';
};
exports.isString = isString;
const isNumber = (value) => {
    return typeof value === 'number' && !isNaN(value);
};
exports.isNumber = isNumber;
const isBoolean = (value) => {
    return typeof value === 'boolean';
};
exports.isBoolean = isBoolean;
const isObject = (value) => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};
exports.isObject = isObject;
const isArray = (value) => {
    return Array.isArray(value);
};
exports.isArray = isArray;
const isDate = (value) => {
    return value instanceof Date && (0, date_fns_1.isValid)(value);
};
exports.isDate = isDate;
// Constants
exports.PHONE_REGEX = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
exports.EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
exports.UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
};
exports.ROLES = {
    EMPLOYEE: {
        APPRENTICE: 'apprentice',
        TECHNICIAN: 'technician',
        INSTALLER: 'installer',
        LEAD_TECHNICIAN: 'lead_technician',
        SUPERVISOR: 'supervisor',
    },
    OWNER: {
        OWNER: 'owner',
        MANAGER: 'manager',
        ADMIN: 'admin',
    },
};
// Logger types and interfaces
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
    LogLevel[LogLevel["SILENT"] = 4] = "SILENT";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
// Logger class
class Logger {
    constructor(config = {}) {
        this.logBuffer = [];
        this.maxBufferSize = 1000;
        this.config = {
            level: this.getLogLevel(),
            enableConsole: this.shouldEnableConsole(),
            enableTimestamps: true,
            enableColors: true,
            enableMetadata: true,
            ...config,
        };
    }
    getLogLevel() {
        const envLevel = process.env.LOG_LEVEL?.toUpperCase();
        switch (envLevel) {
            case 'DEBUG': return LogLevel.DEBUG;
            case 'INFO': return LogLevel.INFO;
            case 'WARN': return LogLevel.WARN;
            case 'ERROR': return LogLevel.ERROR;
            case 'SILENT': return LogLevel.SILENT;
            default: return (0, exports.isDevelopment)() ? LogLevel.DEBUG : LogLevel.INFO;
        }
    }
    shouldEnableConsole() {
        // Only enable console logging in development or when explicitly enabled
        if (process.env.FORCE_CONSOLE_LOGGING === 'true')
            return true;
        if (process.env.DISABLE_CONSOLE_LOGGING === 'true')
            return false;
        return (0, exports.isDevelopment)() || (0, exports.isTest)();
    }
    formatTimestamp() {
        return new Date().toISOString();
    }
    getColorCode(level) {
        if (!this.config.enableColors)
            return '';
        switch (level) {
            case LogLevel.DEBUG: return '\x1b[36m'; // Cyan
            case LogLevel.INFO: return '\x1b[32m'; // Green
            case LogLevel.WARN: return '\x1b[33m'; // Yellow
            case LogLevel.ERROR: return '\x1b[31m'; // Red
            default: return '';
        }
    }
    getResetCode() {
        return this.config.enableColors ? '\x1b[0m' : '';
    }
    formatMessage(level, message, metadata) {
        const colorCode = this.getColorCode(level);
        const resetCode = this.getResetCode();
        const timestamp = this.config.enableTimestamps ? `[${this.formatTimestamp()}] ` : '';
        const context = this.config.context ? `[${this.config.context}] ` : '';
        const levelStr = LogLevel[level].toUpperCase();
        const metadataStr = metadata && this.config.enableMetadata ? ` ${JSON.stringify(metadata)}` : '';
        return `${colorCode}${timestamp}${context}${levelStr}: ${message}${metadataStr}${resetCode}`;
    }
    shouldLog(level) {
        return level >= this.config.level;
    }
    addToBuffer(entry) {
        this.logBuffer.push(entry);
        if (this.logBuffer.length > this.maxBufferSize) {
            this.logBuffer.shift(); // Remove oldest entry
        }
    }
    sendToMonitoringService(entry) {
        // This is where you would integrate with monitoring services like:
        // - Sentry for error tracking
        // - DataDog for application monitoring
        // - Grafana Loki for log aggregation
        // - Custom webhook endpoints
        if (!(0, exports.isProduction)())
            return;
        try {
            // Example integration points:
            // Sentry for errors - check if we're in a browser environment
            if (entry.level === 'ERROR' && typeof window !== 'undefined' && window.Sentry) {
                window.Sentry.captureException(entry.error || new Error(entry.message), {
                    tags: {
                        context: entry.context,
                        level: entry.level,
                    },
                    extra: entry.metadata,
                });
            }
            // Custom webhook for critical errors
            if (entry.level === 'ERROR' && process.env.ERROR_WEBHOOK_URL) {
                // Note: This would need to be async and handled properly in a real implementation
                // fetch(process.env.ERROR_WEBHOOK_URL, {
                //   method: 'POST',
                //   headers: { 'Content-Type': 'application/json' },
                //   body: JSON.stringify(entry),
                // }).catch(() => {}); // Silently fail to avoid logging loops
            }
            // Custom log aggregation service
            if (process.env.LOG_AGGREGATION_URL) {
                // Similar async POST request to log aggregation service
            }
        }
        catch (error) {
            // Silently fail to avoid infinite logging loops
            // In production, you might want to store these in a separate error queue
        }
    }
    log(level, message, metadata, error) {
        if (!this.shouldLog(level))
            return;
        const entry = {
            timestamp: this.formatTimestamp(),
            level: LogLevel[level],
            message,
            context: this.config.context,
            metadata,
            error,
        };
        this.addToBuffer(entry);
        if (this.config.enableConsole) {
            const formattedMessage = this.formatMessage(level, message, metadata);
            switch (level) {
                case LogLevel.DEBUG:
                    console.debug(formattedMessage, error ? error : '');
                    break;
                case LogLevel.INFO:
                    console.info(formattedMessage, error ? error : '');
                    break;
                case LogLevel.WARN:
                    console.warn(formattedMessage, error ? error : '');
                    break;
                case LogLevel.ERROR:
                    console.error(formattedMessage, error ? error : '');
                    break;
            }
        }
        // Send to monitoring service if configured
        this.sendToMonitoringService(entry);
    }
    // Public logging methods
    debug(message, metadata) {
        this.log(LogLevel.DEBUG, message, metadata);
    }
    info(message, metadata) {
        this.log(LogLevel.INFO, message, metadata);
    }
    warn(message, metadata, error) {
        this.log(LogLevel.WARN, message, metadata, error);
    }
    error(message, error, metadata) {
        this.log(LogLevel.ERROR, message, metadata, error);
    }
    // Utility methods
    setContext(context) {
        this.config.context = context;
    }
    setLevel(level) {
        this.config.level = level;
    }
    getBuffer() {
        return [...this.logBuffer];
    }
    clearBuffer() {
        this.logBuffer = [];
    }
    // Create child logger with additional context
    child(context) {
        const childContext = this.config.context ? `${this.config.context}:${context}` : context;
        return new Logger({
            ...this.config,
            context: childContext,
        });
    }
    // Performance timing utility
    time(label) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            this.debug(`Timer started: ${label}`, { type: 'timer', action: 'start', label });
        }
    }
    timeEnd(label) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            this.debug(`Timer ended: ${label}`, { type: 'timer', action: 'end', label });
        }
    }
    // Structured logging for specific use cases
    logHttpRequest(method, url, statusCode, duration) {
        const level = statusCode && statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
        this.log(level, `HTTP ${method} ${url}`, {
            type: 'http_request',
            method,
            url,
            statusCode,
            duration,
        });
    }
    logDatabaseQuery(query, duration, error) {
        if (error) {
            this.error(`Database query failed: ${query}`, error, {
                type: 'database_query',
                query: query.substring(0, 500), // Truncate long queries
                duration,
            });
        }
        else {
            this.debug(`Database query executed: ${query.substring(0, 100)}...`, {
                type: 'database_query',
                query: query.substring(0, 500),
                duration,
            });
        }
    }
    logAuthEvent(event, userId, details) {
        this.info(`Auth event: ${event}`, {
            type: 'auth_event',
            event,
            userId,
            ...details,
        });
    }
    logBusinessEvent(event, details) {
        this.info(`Business event: ${event}`, {
            type: 'business_event',
            event,
            ...details,
        });
    }
}
// Default logger instance
exports.logger = new Logger();
// Factory function to create loggers with context
const createLogger = (context, config) => {
    return new Logger({ ...config, context });
};
exports.createLogger = createLogger;
// Convenience functions that mirror console API but with production safety
exports.log = {
    debug: (message, metadata) => exports.logger.debug(message, metadata),
    info: (message, metadata) => exports.logger.info(message, metadata),
    warn: (message, metadata, error) => exports.logger.warn(message, metadata, error),
    error: (message, error, metadata) => exports.logger.error(message, error, metadata),
    // Legacy console compatibility (but production-safe)
    log: (message, ...args) => exports.logger.info(message, { args }),
    // Structured logging shortcuts
    http: (method, url, statusCode, duration) => exports.logger.logHttpRequest(method, url, statusCode, duration),
    db: (query, duration, error) => exports.logger.logDatabaseQuery(query, duration, error),
    auth: (event, userId, details) => exports.logger.logAuthEvent(event, userId, details),
    business: (event, details) => exports.logger.logBusinessEvent(event, details),
};
