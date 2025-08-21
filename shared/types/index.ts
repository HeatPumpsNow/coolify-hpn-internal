// Shared TypeScript types for Heat Pumps Now monorepo
// Used by both Employee Portal and Owner Portal

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

export type EmployeeRole = 'technician' | 'installer' | 'apprentice' | 'lead_technician' | 'supervisor'
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave' | 'terminated'

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

export type OwnerRole = 'owner' | 'manager' | 'admin'
export type OwnerStatus = 'active' | 'inactive'

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

export type ContactMethod = 'phone' | 'email' | 'text'

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

export type JobPriority = 'low' | 'medium' | 'high' | 'urgent'
export type JobStatus = 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'

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

export type PhotoType = 'before' | 'progress' | 'after' | 'equipment' | 'documentation'

export interface Skill {
  id: string
  name: string
  category: string
  description?: string
  requiredForRoles?: string[]
  createdAt: Date
}

export interface EmployeeSkill {
  id: string
  employeeId: string
  skillId: string
  proficiencyLevel: ProficiencyLevel
  certified: boolean
  certificationDate?: Date
  notes?: string
  createdAt: Date
  
  // Populated fields
  skill?: Skill
}

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export interface KnowledgeArticle {
  id: string
  title: string
  content: string
  category: string
  tags?: string[]
  difficultyLevel: DifficultyLevel
  estimatedReadTime?: number
  authorId?: string
  published: boolean
  viewsCount: number
  createdAt: Date
  updatedAt: Date
  
  // Populated fields
  author?: Owner
  isBookmarked?: boolean
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

export interface KnowledgeBookmark {
  id: string
  employeeId: string
  articleId: string
  createdAt: Date
}

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

export type EarningType = 'hourly' | 'job_completion' | 'bonus' | 'overtime' | 'commission'

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

export type ExpenseCategory = 'materials' | 'fuel' | 'tools' | 'meals' | 'lodging' | 'other'

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

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

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
  role: string
  type: 'employee' | 'owner'
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface JWTPayload {
  userId: string
  email: string
  role: string
  type: 'employee' | 'owner'
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

// File upload types
export interface UploadResponse {
  filename: string
  originalName: string
  path: string
  size: number
  mimeType: string
  url?: string
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: Date
}

// Form validation types
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

// Utility types
export type Nullable<T> = T | null
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

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

// Configuration types
export interface AppConfig {
  database: {
    host: string
    port: number
    database: string
    user: string
    password: string
    ssl: boolean
  }
  redis: {
    host: string
    port: number
    password?: string
  }
  jwt: {
    secret: string
    expiresIn: string
  }
  upload: {
    maxSize: number
    allowedTypes: string[]
    uploadPath: string
  }
  email: {
    host: string
    port: number
    user: string
    password: string
    from: string
  }
}

// ===== CUSTOMER PORTAL TYPES =====

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

export type EquipmentType = 'heat_pump' | 'water_heater' | 'ductwork' | 'thermostat' | 'air_handler' | 'mini_split'

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

export type PerformanceMetricType = 'efficiency' | 'runtime' | 'temperature' | 'energy_usage' | 'comfort_score'
export type DataSource = 'iot_controller' | 'manual' | 'technician'

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

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical'

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

export type ServiceUrgency = 'low' | 'medium' | 'high' | 'emergency'
export type ServiceRequestStatus = 'submitted' | 'acknowledged' | 'in_progress' | 'scheduled' | 'resolved' | 'closed'

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

export type CommunicationMessageType = 'text' | 'photo' | 'status_update' | 'appointment' | 'voice'
export type CommunicationSenderType = 'customer' | 'technician' | 'system'

export interface WarrantyClaim {
  id: string
  customerId: string
  equipmentId: string
  claimType: WarrantyClaimType
  issueDescription: string
  claimAmount?: number
  status: WarrantyStatus
  submittedDate: Date
  manufacturerClaimNumber?: string
  resolutionDate?: Date
  resolutionNotes?: string
  documentationPaths?: string[]
  createdAt: Date
  
  // Populated fields
  customer?: Customer
  equipment?: CustomerEquipment
}

export type WarrantyClaimType = 'parts' | 'labor' | 'full_replacement'
export type WarrantyStatus = 'submitted' | 'under_review' | 'approved' | 'denied' | 'resolved'

export interface EnergySavings {
  id: string
  customerId: string
  equipmentId?: string
  calculationPeriodStart: Date
  calculationPeriodEnd: Date
  baselineEnergyCost?: number
  currentEnergyCost: number
  estimatedSavings: number
  carbonFootprintReduction?: number
  roiPercentage?: number
  utilityDataSource?: string
  calculationMethod: string
  notes?: string
  createdAt: Date
  
  // Populated fields
  customer?: Customer
  equipment?: CustomerEquipment
}

export interface CustomerPreferences {
  id: string
  customerId: string
  notificationPreferences: Record<string, any>
  communicationPreferences: Record<string, any>
  dashboardSettings: Record<string, any>
  privacySettings: Record<string, any>
  maintenanceReminderDays: number
  energyReportFrequency: ReportFrequency
  createdAt: Date
  updatedAt: Date
  
  // Populated fields
  customer?: Customer
}

export type ReportFrequency = 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'disabled'

export interface CustomerRefreshToken {
  id: string
  customerId: string
  tokenHash: string
  deviceId?: string
  deviceName?: string
  userAgent?: string
  ipAddress?: string
  expiresAt: Date
  lastUsed: Date
  createdAt: Date
  
  // Populated fields
  customer?: Customer
}

// Customer authentication types
export interface CustomerAuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  portalAccessEnabled: boolean
  emailVerified: boolean
  type: 'customer'
}

export interface CustomerLoginCredentials {
  email: string
  password: string
}

export interface CustomerRegistrationData {
  firstName: string
  lastName: string
  email: string
  password: string
  phone?: string
  address: string
  city?: string
  state?: string
  zipCode?: string
  equipmentCode?: string // For linking to existing installation
}

export interface CustomerJWTPayload {
  customerId: string
  email: string
  type: 'customer'
  portalAccess: boolean
  iat?: number
  exp?: number
}

// Dashboard and analytics types for customers
export interface CustomerDashboardData {
  equipmentSummary: {
    totalSystems: number
    healthySystemsCount: number
    systemsNeedingAttention: number
    upcomingMaintenance: number
  }
  recentActivity: {
    lastServiceDate?: Date
    nextMaintenanceDate?: Date
    recentCommunications: CustomerCommunication[]
    activeServiceRequests: number
  }
  performanceMetrics: {
    currentEfficiency?: number
    energySavingsThisMonth?: number
    totalSavingsSinceInstallation?: number
    carbonFootprintReduction?: number
  }
  notifications: {
    urgent: number
    maintenance: number
    informational: number
  }
}

// API request/response types for customer portal
export interface CustomerApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

export interface CustomerPaginatedResponse<T = any> {
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