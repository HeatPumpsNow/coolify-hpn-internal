// Shared TypeScript types for Heat Pumps Now Internal Application

// User role types for the unified portal system
export type PortalRole = 'employee' | 'owner' | 'service' | 'installer' | 'supplier' | 'admin' | 'partner' | 'sales'
export type EmployeeRole = 'technician' | 'installer' | 'apprentice' | 'lead_technician' | 'supervisor'
export type OwnerRole = 'owner' | 'manager' | 'admin'
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated'
export type OwnerStatus = 'active' | 'inactive'

// Multi-role user interface for unified portal
export interface InternalUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  roles: PortalRole[]           // Array of portal roles
  primaryRole: PortalRole       // Default portal to show
  permissions: Permission[]     // Granular permissions
  status: 'active' | 'inactive'
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Permission {
  resource: string
  action: string
  scope?: string
}

// Company and organizational types
export interface Company {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
  createdAt: Date
  updatedAt: Date
}

export interface Employee {
  id: string
  companyId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: EmployeeRole
  status: EmployeeStatus
  hireDate?: Date
  wages?: number
  skills?: string[]
  certifications?: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Owner {
  id: string
  companyId: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: OwnerRole
  status: OwnerStatus
  createdAt: Date
  updatedAt: Date
}

export type ContactMethod = 'phone' | 'email' | 'text'

export interface Customer {
  id: string
  companyId: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  address: string
  city?: string
  state?: string
  zipCode?: string
  notes?: string
  preferredContactMethod: ContactMethod
  createdAt: Date
  updatedAt: Date
  
  // Customer portal fields
  passwordHash?: string
  emailVerified?: boolean
  verificationToken?: string
  lastLogin?: Date
  portalAccessEnabled?: boolean
  registrationDate?: Date
}

// Job and service types
export type JobPriority = 'low' | 'medium' | 'high' | 'urgent'
export type JobStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'

export interface Job {
  id: string
  companyId: string
  customerId?: string
  assignedEmployeeId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  address: string
  serviceType: string
  description?: string
  priority: JobPriority
  status: JobStatus
  scheduledDate?: Date
  scheduledTimeStart?: string
  scheduledTimeEnd?: string
  estimatedDuration?: number
  estimatedCost?: number
  actualCost?: number
  completedAt?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
  
  // Populated fields
  customer?: Customer
  assignedEmployee?: Employee
}

export interface JobStatusUpdate {
  id: string
  jobId: string
  employeeId?: string
  oldStatus?: string
  newStatus: string
  notes?: string
  createdAt: Date
  
  // Populated fields
  employee?: Employee
}

export type PhotoType = 'before' | 'progress' | 'after' | 'equipment' | 'documentation'

export interface JobPhoto {
  id: string
  jobId: string
  employeeId?: string
  filename: string
  originalFilename: string
  filePath: string
  fileSize?: number
  mimeType?: string
  description?: string
  photoType: PhotoType
  takenAt?: Date
  approved: boolean
  approvedBy?: string
  approvedAt?: Date
  createdAt: Date
  
  // Populated fields
  employee?: Employee
  approver?: Owner
}

// Equipment and service request types
export type EquipmentType = 'heat_pump' | 'water_heater' | 'ductwork' | 'thermostat' | 'air_handler' | 'mini_split'
export type ServiceUrgency = 'low' | 'medium' | 'high' | 'emergency'
export type ServiceRequestStatus = 'submitted' | 'acknowledged' | 'in_progress' | 'scheduled' | 'resolved' | 'closed'

export interface CustomerEquipment {
  id: string
  customerId: string
  equipmentType: EquipmentType
  brand?: string
  model?: string
  serialNumber?: string
  installationDate?: Date
  warrantyStartDate?: Date
  warrantyEndDate?: Date
  locationDescription?: string
  specifications?: Record<string, any>
  filterSize?: string
  filterType?: string
  lastFilterChange?: Date
  nextFilterChange?: Date
  systemHealthScore: number
  createdAt: Date
  updatedAt: Date
  
  // Populated fields
  customer?: Customer
  performanceMetrics?: EquipmentPerformance[]
  maintenanceSchedules?: MaintenanceSchedule[]
}

export type PerformanceMetricType = 'efficiency' | 'runtime' | 'temperature' | 'energy_usage' | 'comfort_score'
export type DataSource = 'iot_controller' | 'manual' | 'technician'

export interface EquipmentPerformance {
  id: string
  equipmentId: string
  recordedAt: Date
  metricType: PerformanceMetricType
  metricValue: number
  metricUnit: string
  dataSource: DataSource
  notes?: string
  
  // Populated fields
  equipment?: CustomerEquipment
}

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical'

export interface MaintenanceSchedule {
  id: string
  customerId: string
  equipmentId?: string
  maintenanceType: string
  description: string
  frequencyMonths: number
  priority: MaintenancePriority
  nextDueDate: Date
  lastCompletedDate?: Date
  autoGenerated: boolean
  reminderDaysAdvance: number
  createdAt: Date
  updatedAt: Date
  
  // Populated fields
  customer?: Customer
  equipment?: CustomerEquipment
}

export interface ServiceRequest {
  id: string
  customerId: string
  equipmentId?: string
  requestType: string
  urgencyLevel: ServiceUrgency
  title: string
  description: string
  symptoms?: string[]
  customerPhotos?: string[]
  voiceMemoPath?: string
  status: ServiceRequestStatus
  assignedTechnicianId?: string
  relatedJobId?: string
  resolutionNotes?: string
  customerSatisfactionRating?: number
  resolvedAt?: Date
  createdAt: Date
  updatedAt: Date
  
  // Populated fields
  customer?: Customer
  equipment?: CustomerEquipment
  assignedTechnician?: Employee
  relatedJob?: Job
  communications?: CustomerCommunication[]
}

// Communication types
export type CommunicationMessageType = 'text' | 'photo' | 'status_update' | 'appointment' | 'voice'
export type CommunicationSenderType = 'customer' | 'technician' | 'system'

export interface CustomerCommunication {
  id: string
  customerId: string
  employeeId?: string
  serviceRequestId?: string
  jobId?: string
  threadId?: string
  messageType: CommunicationMessageType
  senderType: CommunicationSenderType
  message: string
  attachments?: string[]
  readByCustomer: boolean
  readByTechnician: boolean
  isInternalNote: boolean
  createdAt: Date
  
  // Populated fields
  customer?: Customer
  employee?: Employee
  serviceRequest?: ServiceRequest
  job?: Job
}

// Financial types
export type EarningType = 'hourly' | 'job_completion' | 'bonus' | 'overtime' | 'commission'
export type ExpenseCategory = 'materials' | 'fuel' | 'tools' | 'meals' | 'lodging' | 'other'

export interface Earning {
  id: string
  employeeId: string
  jobId?: string
  earningType: EarningType
  amount: number
  hoursWorked?: number
  overtimeHours?: number
  dateEarned: Date
  description?: string
  approved: boolean
  approvedBy?: string
  approvedAt?: Date
  createdAt: Date
  
  // Populated fields
  job?: Job
  approver?: Owner
}

export interface Expense {
  id: string
  employeeId?: string
  jobId?: string
  category: ExpenseCategory
  amount: number
  description: string
  receiptFilename?: string
  receiptPath?: string
  expenseDate: Date
  approved: boolean
  approvedBy?: string
  approvedAt?: Date
  reimbursed: boolean
  reimbursedAt?: Date
  createdAt: Date
  
  // Populated fields
  employee?: Employee
  job?: Job
  approver?: Owner
}

// Notification types
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Notification {
  id: string
  recipientType: 'employee' | 'owner'
  recipientId: string
  type: string
  title: string
  message: string
  data?: Record<string, any>
  read: boolean
  priority: NotificationPriority
  actionUrl?: string
  expiresAt?: Date
  createdAt: Date
  readAt?: Date
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Authentication types
export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  roles: PortalRole[]
  primaryRole: PortalRole
  type: 'internal_user'
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface JWTPayload {
  userId: string
  email: string
  roles: PortalRole[]
  primaryRole: PortalRole
  type: 'internal_user'
  iat?: number
  exp?: number
}

// Dashboard types
export interface DashboardStats {
  totalJobs: number
  activeJobs: number
  completedJobs: number
  totalRevenue: number
  activeEmployees: number
  pendingApprovals: number
}

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: any
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: Date
}

export interface ValidationError {
  field: string
  message: string
}

export interface FormState<T = any> {
  data: T
  errors: ValidationError[]
  isSubmitting: boolean
  isValid: boolean
}

// Database query types
export interface QueryOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, any>
  search?: string
}

export interface DatabaseResult<T = any> {
  rows: T[]
  rowCount: number
}

// Utility types
export type Nullable<T> = T | null
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Constants
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

export const PORTAL_ROLES = {
  EMPLOYEE: 'employee',
  OWNER: 'owner',
  SERVICE: 'service',
  INSTALLER: 'installer',
  SUPPLIER: 'supplier',
  ADMIN: 'admin',
  PARTNER: 'partner',
  SALES: 'sales',
} as const