// Shared utility functions for Heat Pumps Now applications

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import validator from 'validator'
import { format, parseISO, isValid } from 'date-fns'

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash)
}

// JWT utilities
export const generateToken = (payload: object, secret: string, expiresIn: string = '7d'): string => {
  if (!secret) {
    throw new Error('JWT secret is required')
  }
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions)
}

export const verifyToken = <T = any>(token: string, secret: string): T => {
  if (!secret) {
    throw new Error('JWT secret is required')
  }
  return jwt.verify(token, secret) as T
}

// Validation utilities
export const validateEmail = (email: string): boolean => {
  return validator.isEmail(email)
}

export const validatePhone = (phone: string): boolean => {
  // US phone number validation
  const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// String utilities
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export const capitalizeWords = (str: string): string => {
  return str.split(' ').map(capitalize).join(' ')
}

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const truncate = (str: string, maxLength: number, suffix: string = '...'): string => {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength - suffix.length) + suffix
}

// Number utilities
export const formatCurrency = (amount: number, currency: string = 'USD', locale: string = 'en-US'): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

export const formatNumber = (num: number, locale: string = 'en-US'): string => {
  return new Intl.NumberFormat(locale).format(num)
}

export const roundToDecimal = (num: number, decimals: number = 2): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

// Date utilities
export const formatDate = (date: Date | string, dateFormat: string = 'yyyy-MM-dd'): string => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsedDate)) {
    throw new Error('Invalid date provided')
  }
  return format(parsedDate, dateFormat)
}

export const formatDateTime = (date: Date | string, dateFormat: string = 'yyyy-MM-dd HH:mm'): string => {
  return formatDate(date, dateFormat)
}

export const formatRelativeTime = (date: Date | string): string => {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - parsedDate.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`
  return `${Math.floor(diffInSeconds / 31536000)} years ago`
}

// Array utilities
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)]
}

export const groupBy = <T, K extends keyof T>(array: T[], key: K): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key])
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export const sortBy = <T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] => {
  return array.sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1
    if (aVal > bVal) return order === 'asc' ? 1 : -1
    return 0
  })
}

// Object utilities
export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      (result as any)[key] = obj[key]
    }
  }
  return result
}

export const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0
  if (obj instanceof Map || obj instanceof Set) return obj.size === 0
  return Object.keys(obj).length === 0
}

// File utilities
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2)
}

export const getFileName = (filename: string): string => {
  return filename.substring(0, filename.lastIndexOf('.')) || filename
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const isImageFile = (filename: string): boolean => {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
  const ext = getFileExtension(filename).toLowerCase()
  return imageExtensions.includes(`.${ext}`)
}

// URL utilities
export const buildUrl = (baseUrl: string, path: string, params?: Record<string, string>): string => {
  const url = new URL(path, baseUrl)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  
  return url.toString()
}

export const parseQueryString = (queryString: string): Record<string, string> => {
  const params = new URLSearchParams(queryString)
  const result: Record<string, string> = {}
  
  for (const [key, value] of params) {
    result[key] = value
  }
  
  return result
}

// Error utilities
export const createError = (message: string, code?: string, details?: any): Error & { code?: string; details?: any } => {
  const error = new Error(message) as Error & { code?: string; details?: any }
  if (code) error.code = code
  if (details) error.details = details
  return error
}

export const isError = (value: any): value is Error => {
  return value instanceof Error
}

// Async utilities
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const retry = async <T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === attempts - 1) throw error
      await sleep(delay * Math.pow(2, i)) // Exponential backoff
    }
  }
  throw new Error('Retry attempts exhausted')
}

// Environment utilities
export const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name]
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue
    throw new Error(`Environment variable ${name} is required`)
  }
  return value
}

export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production'
}

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development'
}

export const isTest = (): boolean => {
  return process.env.NODE_ENV === 'test'
}

// Type guards
export const isString = (value: any): value is string => {
  return typeof value === 'string'
}

export const isNumber = (value: any): value is number => {
  return typeof value === 'number' && !isNaN(value)
}

export const isBoolean = (value: any): value is boolean => {
  return typeof value === 'boolean'
}

export const isObject = (value: any): value is object => {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export const isArray = <T>(value: any): value is T[] => {
  return Array.isArray(value)
}

export const isDate = (value: any): value is Date => {
  return value instanceof Date && isValid(value)
}

// Constants
export const PHONE_REGEX = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const HTTP_STATUS = {
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
} as const

export const ROLES = {
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
} as const

// Default logger instance (simplified for now)
export const logger = {
  debug: (message: string, metadata?: Record<string, any>) => console.debug(message, metadata),
  info: (message: string, metadata?: Record<string, any>) => console.info(message, metadata),
  warn: (message: string, metadata?: Record<string, any>, error?: Error) => console.warn(message, metadata, error),
  error: (message: string, error?: Error, metadata?: Record<string, any>) => console.error(message, error, metadata),
}

// Simplified log export
export const log = logger