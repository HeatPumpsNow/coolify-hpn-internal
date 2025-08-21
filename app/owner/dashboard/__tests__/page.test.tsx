import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import Dashboard from '../page'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}))

// Mock the chart components
jest.mock('@/components/charts/LineChart', () => {
  return function MockLineChart({ data, lines }: any) {
    return (
      <div data-testid="line-chart">
        <div data-testid="chart-data">{JSON.stringify(data)}</div>
        <div data-testid="chart-lines">{JSON.stringify(lines)}</div>
      </div>
    )
  }
})

jest.mock('@/components/charts/BarChart', () => {
  return function MockBarChart({ data, bars }: any) {
    return (
      <div data-testid="bar-chart">
        <div data-testid="chart-data">{JSON.stringify(data)}</div>
        <div data-testid="chart-bars">{JSON.stringify(bars)}</div>
      </div>
    )
  }
})

jest.mock('@/components/charts/PieChart', () => {
  return function MockPieChart({ data }: any) {
    return (
      <div data-testid="pie-chart">
        <div data-testid="chart-data">{JSON.stringify(data)}</div>
      </div>
    )
  }
})

// Mock fetch
global.fetch = jest.fn()

const mockDashboardData = {
  overview: {
    totalRevenue: 125000,
    totalJobs: 45,
    activeEmployees: 8,
    completionRate: 92
  },
  recentJobs: [
    {
      id: 'job-1',
      customerName: 'Alice Johnson',
      serviceType: 'installation',
      status: 'scheduled',
      priority: 'high',
      scheduledDate: '2024-08-01',
      assignedEmployee: 'John Doe'
    },
    {
      id: 'job-2',
      customerName: 'Bob Smith',
      serviceType: 'maintenance',
      status: 'in_progress',
      priority: 'medium',
      scheduledDate: '2024-07-31',
      assignedEmployee: 'Jane Smith'
    }
  ],
  revenueData: [
    { month: 'Jan', revenue: 18000, expenses: 12000 },
    { month: 'Feb', revenue: 22000, expenses: 14000 },
    { month: 'Mar', revenue: 25000, expenses: 15000 },
    { month: 'Apr', revenue: 28000, expenses: 16000 },
    { month: 'May', revenue: 32000, expenses: 18000 },
    { month: 'Jun', revenue: 35000, expenses: 20000 }
  ],
  jobStatusData: [
    { status: 'Completed', count: 28, color: '#10B981' },
    { status: 'In Progress', count: 8, color: '#F59E0B' },
    { status: 'Scheduled', count: 6, color: '#3B82F6' },
    { status: 'Pending', count: 3, color: '#6B7280' }
  ],
  employeePerformance: [
    { name: 'John Doe', completed: 12, revenue: 28000 },
    { name: 'Jane Smith', completed: 10, revenue: 24000 },
    { name: 'Mike Johnson', completed: 8, revenue: 18000 },
    { name: 'Sarah Wilson', completed: 6, revenue: 15000 }
  ]
}

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData
    })
  })

  it('renders loading state initially', () => {
    render(<Dashboard />)
    
    expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('renders dashboard content after loading', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading dashboard...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Executive Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Business Overview')).toBeInTheDocument()
  })

  it('displays overview metrics correctly', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('$125,000')).toBeInTheDocument() // Total Revenue
      expect(screen.getByText('45')).toBeInTheDocument() // Total Jobs
      expect(screen.getByText('8')).toBeInTheDocument() // Active Employees
      expect(screen.getByText('92%')).toBeInTheDocument() // Completion Rate
    })
  })

  it('displays recent jobs section', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Recent Jobs')).toBeInTheDocument()
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument()
      expect(screen.getByText('Bob Smith')).toBeInTheDocument()
      expect(screen.getByText('installation')).toBeInTheDocument()
      expect(screen.getByText('maintenance')).toBeInTheDocument()
    })
  })

  it('renders revenue chart', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    })

    const chartData = screen.getByTestId('chart-data')
    expect(chartData).toHaveTextContent('Jan')
    expect(chartData).toHaveTextContent('revenue')
    expect(chartData).toHaveTextContent('expenses')
  })

  it('renders job status pie chart', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument()
    })

    const chartData = screen.getByTestId('chart-data')
    expect(chartData).toHaveTextContent('Completed')
    expect(chartData).toHaveTextContent('In Progress')
    expect(chartData).toHaveTextContent('Scheduled')
  })

  it('renders employee performance chart', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    })

    const chartData = screen.getByTestId('chart-data')
    expect(chartData).toHaveTextContent('John Doe')
    expect(chartData).toHaveTextContent('Jane Smith')
  })

  it('handles API error gracefully', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))
    
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument()
      expect(screen.getByText('Please try refreshing the page')).toBeInTheDocument()
    })
  })

  it('handles empty data gracefully', async () => {
    const emptyData = {
      overview: {
        totalRevenue: 0,
        totalJobs: 0,
        activeEmployees: 0,
        completionRate: 0
      },
      recentJobs: [],
      revenueData: [],
      jobStatusData: [],
      employeePerformance: []
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => emptyData
    })
    
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('$0')).toBeInTheDocument()
      expect(screen.getByText('No recent jobs')).toBeInTheDocument()
    })
  })

  it('formats currency values correctly', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      // Should format large numbers with commas
      expect(screen.getByText('$125,000')).toBeInTheDocument()
    })
  })

  it('displays job priority indicators', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      // Check for priority badges
      const highPriorityElements = screen.getAllByText('high')
      const mediumPriorityElements = screen.getAllByText('medium')
      
      expect(highPriorityElements.length).toBeGreaterThan(0)
      expect(mediumPriorityElements.length).toBeGreaterThan(0)
    })
  })

  it('displays job status badges', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('scheduled')).toBeInTheDocument()
      expect(screen.getByText('in_progress')).toBeInTheDocument()
    })
  })

  it('shows correct section headers', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Business Overview')).toBeInTheDocument()
      expect(screen.getByText('Recent Jobs')).toBeInTheDocument()
      expect(screen.getByText('Revenue Trends')).toBeInTheDocument()
      expect(screen.getByText('Job Status Distribution')).toBeInTheDocument()
      expect(screen.getByText('Employee Performance')).toBeInTheDocument()
    })
  })

  it('makes correct API call on mount', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/owner/dashboard', {
        credentials: 'include'
      })
    })
  })

  it('displays metric labels correctly', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Total Revenue')).toBeInTheDocument()
      expect(screen.getByText('Total Jobs')).toBeInTheDocument()
      expect(screen.getByText('Active Employees')).toBeInTheDocument()
      expect(screen.getByText('Completion Rate')).toBeInTheDocument()
    })
  })
})