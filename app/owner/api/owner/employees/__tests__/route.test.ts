import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from '../route'

// Mock JWT verification
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({ 
    ownerId: 'owner-123', 
    role: 'owner' 
  }),
}))

// Mock database
const mockEmployees = [
  {
    id: 'emp-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '555-0101',
    role: 'technician',
    status: 'active',
    hire_date: '2024-01-15',
    wages: 25.00,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'emp-2',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    phone: '555-0102',
    role: 'installer',
    status: 'active',
    hire_date: '2024-02-01',
    wages: 28.00,
    created_at: new Date(),
    updated_at: new Date()
  }
]

jest.mock('@/lib/db', () => ({
  pool: {
    query: jest.fn()
  }
}))

const { pool } = require('@/lib/db')

describe('/api/owner/employees', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/owner/employees', () => {
    it('should return list of employees for authenticated owner', async () => {
      pool.query.mockResolvedValueOnce({ rows: mockEmployees })

      const request = new NextRequest('http://localhost:3000/api/owner/employees', {
        headers: { 
          cookie: 'owner_token=valid-token'
        }
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.employees).toHaveLength(2)
      expect(data.employees[0]).toMatchObject({
        id: 'emp-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      })
    })

    it('should return 401 for unauthenticated request', async () => {
      const request = new NextRequest('http://localhost:3000/api/owner/employees')

      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should handle database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/owner/employees', {
        headers: { 
          cookie: 'owner_token=valid-token'
        }
      })

      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/owner/employees', () => {
    const newEmployee = {
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob@example.com',
      phone: '555-0103',
      role: 'technician',
      wages: 24.00
    }

    it('should create new employee successfully', async () => {
      pool.query.mockResolvedValueOnce({ 
        rows: [{
          id: 'emp-3',
          first_name: 'Bob',
          last_name: 'Wilson',
          email: 'bob@example.com',
          phone: '555-0103',
          role: 'technician',
          status: 'active',
          wages: 24.00,
          created_at: new Date()
        }]
      })

      const request = new NextRequest('http://localhost:3000/api/owner/employees', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          cookie: 'owner_token=valid-token'
        },
        body: JSON.stringify(newEmployee)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.employee.firstName).toBe('Bob')
      expect(data.employee.email).toBe('bob@example.com')
    })

    it('should validate required fields', async () => {
      const invalidEmployee = {
        firstName: 'Bob',
        // Missing required fields
      }

      const request = new NextRequest('http://localhost:3000/api/owner/employees', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          cookie: 'owner_token=valid-token'
        },
        body: JSON.stringify(invalidEmployee)
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should handle duplicate email', async () => {
      pool.query.mockRejectedValueOnce({
        code: '23505', // PostgreSQL unique violation
        constraint: 'employees_email_key'
      })

      const request = new NextRequest('http://localhost:3000/api/owner/employees', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          cookie: 'owner_token=valid-token'
        },
        body: JSON.stringify(newEmployee)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.message).toContain('email already exists')
    })
  })
})

describe('/api/owner/employees/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('PUT /api/owner/employees/[id]', () => {
    it('should update employee successfully', async () => {
      const updatedEmployee = {
        id: 'emp-1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com', // Updated email
        phone: '555-0101',
        role: 'senior_technician', // Updated role
        status: 'active',
        wages: 27.00, // Updated wages
        updated_at: new Date()
      }

      pool.query.mockResolvedValueOnce({ rows: [updatedEmployee] })

      const updateData = {
        email: 'john.doe@example.com',
        role: 'senior_technician',
        wages: 27.00
      }

      const request = new NextRequest('http://localhost:3000/api/owner/employees/emp-1', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          cookie: 'owner_token=valid-token'
        },
        body: JSON.stringify(updateData)
      })

      const context = { params: Promise.resolve({ id: 'emp-1' }) }
      const response = await PUT(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.employee.email).toBe('john.doe@example.com')
      expect(data.employee.role).toBe('senior_technician')
    })

    it('should return 404 for non-existent employee', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] })

      const request = new NextRequest('http://localhost:3000/api/owner/employees/non-existent', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          cookie: 'owner_token=valid-token'
        },
        body: JSON.stringify({ wages: 30.00 })
      })

      const context = { params: Promise.resolve({ id: 'non-existent' }) }
      const response = await PUT(request, context)

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/owner/employees/[id]', () => {
    it('should deactivate employee successfully', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 1 })

      const request = new NextRequest('http://localhost:3000/api/owner/employees/emp-1', {
        method: 'DELETE',
        headers: { 
          cookie: 'owner_token=valid-token'
        }
      })

      const context = { params: Promise.resolve({ id: 'emp-1' }) }
      const response = await DELETE(request, context)

      expect(response.status).toBe(200)
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE employees SET status = $1'),
        ['inactive', 'emp-1']
      )
    })

    it('should return 404 for non-existent employee', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 0 })

      const request = new NextRequest('http://localhost:3000/api/owner/employees/non-existent', {
        method: 'DELETE',
        headers: { 
          cookie: 'owner_token=valid-token'
        }
      })

      const context = { params: Promise.resolve({ id: 'non-existent' }) }
      const response = await DELETE(request, context)

      expect(response.status).toBe(404)
    })
  })
})