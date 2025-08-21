import { NextRequest } from 'next/server'
import { GET, POST, PUT } from '../route'

// Mock JWT verification
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({ 
    ownerId: 'owner-123', 
    role: 'owner' 
  }),
}))

// Mock database
const mockJobs = [
  {
    id: 'job-1',
    customer_name: 'Alice Johnson',
    customer_email: 'alice@example.com',
    customer_phone: '555-0201',
    address: '123 Main St, City, ST 12345',
    service_type: 'installation',
    priority: 'high',
    status: 'scheduled',
    assigned_employee_id: 'emp-1',
    scheduled_date: '2024-08-01',
    estimated_duration: 4,
    estimated_cost: 5000.00,
    notes: 'New heat pump installation',
    created_at: new Date(),
    updated_at: new Date(),
    employee_name: 'John Doe'
  },
  {
    id: 'job-2',
    customer_name: 'Bob Smith',
    customer_email: 'bob@example.com',
    customer_phone: '555-0202',
    address: '456 Oak Ave, City, ST 12345',
    service_type: 'maintenance',
    priority: 'medium',
    status: 'pending',
    assigned_employee_id: null,
    scheduled_date: null,
    estimated_duration: 2,
    estimated_cost: 250.00,
    notes: 'Annual maintenance check',
    created_at: new Date(),
    updated_at: new Date(),
    employee_name: null
  }
]

jest.mock('@/lib/db', () => ({
  pool: {
    query: jest.fn()
  }
}))

const { pool } = require('@/lib/db')

describe('/api/owner/jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/owner/jobs', () => {
    it('should return list of jobs for authenticated owner', async () => {
      pool.query.mockResolvedValueOnce({ rows: mockJobs })

      const request = new NextRequest('http://localhost:3000/api/owner/jobs', {
        headers: { 
          cookie: 'owner_token=valid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobs).toHaveLength(2)
      expect(data.jobs[0]).toMatchObject({
        id: 'job-1',
        customerName: 'Alice Johnson',
        serviceType: 'installation',
        status: 'scheduled'
      })
    })

    it('should filter jobs by status', async () => {
      const scheduledJobs = mockJobs.filter(job => job.status === 'scheduled')
      pool.query.mockResolvedValueOnce({ rows: scheduledJobs })

      const request = new NextRequest('http://localhost:3000/api/owner/jobs?status=scheduled', {
        headers: { 
          cookie: 'owner_token=valid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobs).toHaveLength(1)
      expect(data.jobs[0].status).toBe('scheduled')
    })

    it('should filter jobs by priority', async () => {
      const highPriorityJobs = mockJobs.filter(job => job.priority === 'high')
      pool.query.mockResolvedValueOnce({ rows: highPriorityJobs })

      const request = new NextRequest('http://localhost:3000/api/owner/jobs?priority=high', {
        headers: { 
          cookie: 'owner_token=valid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.jobs).toHaveLength(1)
      expect(data.jobs[0].priority).toBe('high')
    })

    it('should return 401 for unauthenticated request', async () => {
      const request = new NextRequest('http://localhost:3000/api/owner/jobs')

      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/owner/jobs', () => {
    const newJob = {
      customerName: 'Carol Davis',
      customerEmail: 'carol@example.com',
      customerPhone: '555-0203',
      address: '789 Pine St, City, ST 12345',
      serviceType: 'repair',
      priority: 'urgent',
      estimatedDuration: 3,
      estimatedCost: 800.00,
      notes: 'Emergency repair needed'
    }

    it('should create new job successfully', async () => {
      pool.query.mockResolvedValueOnce({ 
        rows: [{
          id: 'job-3',
          customer_name: 'Carol Davis',
          customer_email: 'carol@example.com',
          customer_phone: '555-0203',
          address: '789 Pine St, City, ST 12345',
          service_type: 'repair',
          priority: 'urgent',
          status: 'pending',
          estimated_duration: 3,
          estimated_cost: 800.00,
          notes: 'Emergency repair needed',
          created_at: new Date()
        }]
      })

      const request = new NextRequest('http://localhost:3000/api/owner/jobs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          cookie: 'owner_token=valid-token'
        },
        body: JSON.stringify(newJob)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.job.customerName).toBe('Carol Davis')
      expect(data.job.priority).toBe('urgent')
      expect(data.job.status).toBe('pending')
    })

    it('should validate required fields', async () => {
      const invalidJob = {
        customerName: 'Carol Davis',
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/owner/jobs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          cookie: 'owner_token=valid-token'
        },
        body: JSON.stringify(invalidJob)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should validate email format', async () => {
      const invalidEmailJob = {
        ...newJob,
        customerEmail: 'invalid-email'
      }

      const request = new NextRequest('http://localhost:3000/api/owner/jobs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          cookie: 'owner_token=valid-token'
        },
        body: JSON.stringify(invalidEmailJob)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('PUT /api/owner/jobs/[id]', () => {
    it('should update job successfully', async () => {
      const updatedJob = {
        ...mockJobs[0],
        status: 'in_progress',
        assigned_employee_id: 'emp-2',
        scheduled_date: '2024-08-02',
        updated_at: new Date()
      }

      pool.query.mockResolvedValueOnce({ rows: [updatedJob] })

      const updateData = {
        status: 'in_progress',
        assignedEmployeeId: 'emp-2',
        scheduledDate: '2024-08-02'
      }

      const request = new NextRequest('http://localhost:3000/api/owner/jobs/job-1', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          cookie: 'owner_token=valid-token'
        },
        body: JSON.stringify(updateData)
      })

      const context = { params: Promise.resolve({ id: 'job-1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.job.status).toBe('in_progress')
      expect(data.job.assignedEmployeeId).toBe('emp-2')
    })

    it('should return 404 for non-existent job', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] })

      const request = new NextRequest('http://localhost:3000/api/owner/jobs/non-existent', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          cookie: 'owner_token=valid-token'
        },
        body: JSON.stringify({ status: 'completed' })
      })

      const context = { params: Promise.resolve({ id: 'non-existent' }) }
      const response = await PUT(request, context)

      expect(response.status).toBe(404)
    })

    it('should validate status transitions', async () => {
      const request = new NextRequest('http://localhost:3000/api/owner/jobs/job-1', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          cookie: 'owner_token=valid-token'
        },
        body: JSON.stringify({ status: 'invalid_status' })
      })

      const context = { params: Promise.resolve({ id: 'job-1' }) }
      const response = await PUT(request, context)

      expect(response.status).toBe(400)
    })
  })
})