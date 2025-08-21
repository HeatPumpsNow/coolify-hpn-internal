export declare const hashPassword: (password: string) => Promise<string>;
export declare const comparePassword: (password: string, hash: string) => Promise<boolean>;
export declare const generateToken: (payload: object, secret: string, expiresIn?: string) => string;
export declare const verifyToken: <T = any>(token: string, secret: string) => T;
export declare const validateEmail: (email: string) => boolean;
export declare const validatePhone: (phone: string) => boolean;
export declare const validatePassword: (password: string) => {
    isValid: boolean;
    errors: string[];
};
export declare const capitalize: (str: string) => string;
export declare const capitalizeWords: (str: string) => string;
export declare const slugify: (str: string) => string;
export declare const truncate: (str: string, maxLength: number, suffix?: string) => string;
export declare const formatCurrency: (amount: number, currency?: string, locale?: string) => string;
export declare const formatNumber: (num: number, locale?: string) => string;
export declare const roundToDecimal: (num: number, decimals?: number) => number;
export declare const formatDate: (date: Date | string, dateFormat?: string) => string;
export declare const formatDateTime: (date: Date | string, dateFormat?: string) => string;
export declare const formatRelativeTime: (date: Date | string) => string;
export declare const chunk: <T>(array: T[], size: number) => T[][];
export declare const unique: <T>(array: T[]) => T[];
export declare const groupBy: <T, K extends keyof T>(array: T[], key: K) => Record<string, T[]>;
export declare const sortBy: <T>(array: T[], key: keyof T, order?: "asc" | "desc") => T[];
export declare const pick: <T extends object, K extends keyof T>(obj: T, keys: K[]) => Pick<T, K>;
export declare const omit: <T extends object, K extends keyof T>(obj: T, keys: K[]) => Omit<T, K>;
export declare const isEmpty: (obj: any) => boolean;
export declare const getFileExtension: (filename: string) => string;
export declare const getFileName: (filename: string) => string;
export declare const formatFileSize: (bytes: number) => string;
export declare const isImageFile: (filename: string) => boolean;
export declare const buildUrl: (baseUrl: string, path: string, params?: Record<string, string>) => string;
export declare const parseQueryString: (queryString: string) => Record<string, string>;
export declare const createError: (message: string, code?: string, details?: any) => Error & {
    code?: string;
    details?: any;
};
export declare const isError: (value: any) => value is Error;
export declare const sleep: (ms: number) => Promise<void>;
export declare const retry: <T>(fn: () => Promise<T>, attempts?: number, delay?: number) => Promise<T>;
export declare const getEnvVar: (name: string, defaultValue?: string) => string;
export declare const isProduction: () => boolean;
export declare const isDevelopment: () => boolean;
export declare const isTest: () => boolean;
export declare const isString: (value: any) => value is string;
export declare const isNumber: (value: any) => value is number;
export declare const isBoolean: (value: any) => value is boolean;
export declare const isObject: (value: any) => value is object;
export declare const isArray: <T>(value: any) => value is T[];
export declare const isDate: (value: any) => value is Date;
export declare const PHONE_REGEX: RegExp;
export declare const EMAIL_REGEX: RegExp;
export declare const UUID_REGEX: RegExp;
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly INTERNAL_SERVER_ERROR: 500;
};
export declare const ROLES: {
    readonly EMPLOYEE: {
        readonly APPRENTICE: "apprentice";
        readonly TECHNICIAN: "technician";
        readonly INSTALLER: "installer";
        readonly LEAD_TECHNICIAN: "lead_technician";
        readonly SUPERVISOR: "supervisor";
    };
    readonly OWNER: {
        readonly OWNER: "owner";
        readonly MANAGER: "manager";
        readonly ADMIN: "admin";
    };
};
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    SILENT = 4
}
export interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    context?: string;
    metadata?: Record<string, any>;
    error?: Error;
}
export interface LoggerConfig {
    level: LogLevel;
    enableConsole: boolean;
    enableTimestamps: boolean;
    context?: string;
    enableColors: boolean;
    enableMetadata: boolean;
}
declare class Logger {
    private config;
    private logBuffer;
    private maxBufferSize;
    constructor(config?: Partial<LoggerConfig>);
    private getLogLevel;
    private shouldEnableConsole;
    private formatTimestamp;
    private getColorCode;
    private getResetCode;
    private formatMessage;
    private shouldLog;
    private addToBuffer;
    private sendToMonitoringService;
    private log;
    debug(message: string, metadata?: Record<string, any>): void;
    info(message: string, metadata?: Record<string, any>): void;
    warn(message: string, metadata?: Record<string, any>, error?: Error): void;
    error(message: string, error?: Error, metadata?: Record<string, any>): void;
    setContext(context: string): void;
    setLevel(level: LogLevel): void;
    getBuffer(): LogEntry[];
    clearBuffer(): void;
    child(context: string): Logger;
    time(label: string): void;
    timeEnd(label: string): void;
    logHttpRequest(method: string, url: string, statusCode?: number, duration?: number): void;
    logDatabaseQuery(query: string, duration?: number, error?: Error): void;
    logAuthEvent(event: string, userId?: string, details?: Record<string, any>): void;
    logBusinessEvent(event: string, details?: Record<string, any>): void;
}
export declare const logger: Logger;
export declare const createLogger: (context: string, config?: Partial<LoggerConfig>) => Logger;
export declare const log: {
    debug: (message: string, metadata?: Record<string, any>) => void;
    info: (message: string, metadata?: Record<string, any>) => void;
    warn: (message: string, metadata?: Record<string, any>, error?: Error) => void;
    error: (message: string, error?: Error, metadata?: Record<string, any>) => void;
    log: (message: string, ...args: any[]) => void;
    http: (method: string, url: string, statusCode?: number, duration?: number) => void;
    db: (query: string, duration?: number, error?: Error) => void;
    auth: (event: string, userId?: string, details?: Record<string, any>) => void;
    business: (event: string, details?: Record<string, any>) => void;
};
export {};
