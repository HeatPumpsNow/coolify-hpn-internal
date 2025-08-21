'use client';

import { useState, useEffect } from 'react';
import { log } from '@/../../shared/utils';
import { 
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Plus,
  MoreVertical,
  MapPin,
  Phone,
  Mail,
  User,
  Wrench,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Settings,
  UserCheck,
  UserX,
  RotateCcw
} from 'lucide-react';
import { BarChart, PieChart } from '@/components/charts';

interface Job {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceType: string;
  description?: string;
  address: string;
  scheduledDate: string;
  estimatedDuration: number;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  totalAmount: number;
  specialInstructions?: string;
  equipmentNeeded: string[];
  skillsRequired: string[];
  assignedEmployee?: {
    id: string;
    name: string;
    role: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
  itemType?: 'job' | 'service_request';
}

interface JobStatistics {
  totalJobs: number;
  scheduledJobs: number;
  activeJobs: number;
  completedJobs: number;
  urgentJobs: number;
  averageJobValue: number;
  jobsThisWeek: number;
}

interface EmployeeWorkload {
  id: string;
  name: string;
  role: string;
  activeJobs: number;
  totalHours: number;
  latestJobDate?: string;
  averageRating?: string;
  availability: 'available' | 'busy' | 'overloaded';
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [statistics, setStatistics] = useState<JobStatistics | null>(null);
  const [employeeWorkload, setEmployeeWorkload] = useState<EmployeeWorkload[]>([]);
  const [unassignedJobs, setUnassignedJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [dateRange, setDateRange] = useState('30');
  const [selectedView, setSelectedView] = useState<'list' | 'calendar' | 'board'>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignmentData, setReassignmentData] = useState<{
    itemId: string;
    itemType: 'job' | 'service_request';
    currentEmployee?: { id: string; name: string };
    title: string;
  } | null>(null);

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, priorityFilter, assigneeFilter, dateRange, searchTerm]);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        priority: priorityFilter,
        assignedTo: assigneeFilter,
        dateRange,
        search: searchTerm
      });

      const response = await fetch(`/api/owner/jobs?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs);
        setStatistics(data.statistics);
        setEmployeeWorkload(data.employeeWorkload);
        setUnassignedJobs(data.unassignedJobs);
      } else {
        log.error('Failed to fetch jobs', new Error('API response not ok'), { status: response.status });
      }
    } catch (error) {
      log.error('Error fetching jobs', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobAssignment = async (jobId: string, action: 'assign' | 'unassign' | 'auto-assign', employeeId?: string) => {
    try {
      const response = await fetch('/api/owner/jobs/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          jobId,
          action,
          employeeId
        })
      });

      if (response.ok) {
        const result = await response.json();
        fetchJobs(); // Refresh data
        log.info('Job assignment successful', { message: result.message, jobId, action, employeeId });
      } else {
        const error = await response.json();
        log.error('Job assignment failed', new Error(error.error), { jobId, action, employeeId });
      }
    } catch (error) {
      log.error('Error assigning job', error as Error, { jobId, action, employeeId });
    }
  };

  const handleServiceRequestConversion = async (serviceRequestId: string) => {
    try {
      const response = await fetch('/api/owner/service-requests/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          serviceRequestId,
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
          estimatedDuration: 4,
          priority: 'medium'
        })
      });

      if (response.ok) {
        const result = await response.json();
        fetchJobs(); // Refresh data
        log.info('Service request converted to job', { convertedJobId: result.job.id, serviceRequestId });
      } else {
        const error = await response.json();
        log.error('Service request conversion failed', new Error(error.error), { serviceRequestId });
      }
    } catch (error) {
      log.error('Error converting service request', error as Error, { serviceRequestId });
    }
  };

  const handleServiceRequestAssign = async (serviceRequestId: string) => {
    // Find the best available technician
    const availableTech = employeeWorkload.find(emp => emp.availability === 'available');
    
    if (!availableTech) {
      log.warn('No available technicians found for service request assignment', { serviceRequestId });
      return;
    }

    try {
      const response = await fetch('/api/owner/service-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          serviceRequestId,
          action: 'assign_technician',
          technicianId: availableTech.id
        })
      });

      if (response.ok) {
        const result = await response.json();
        fetchJobs(); // Refresh data
        log.info('Service request assigned to technician', { serviceRequestId, technicianId: availableTech.id });
      } else {
        const error = await response.json();
        log.error('Service request assignment failed', new Error(error.error), { serviceRequestId, technicianId: availableTech.id });
      }
    } catch (error) {
      log.error('Error assigning service request', error as Error, { serviceRequestId });
    }
  };

  const handleReassignment = async (newEmployeeId: string, reason?: string) => {
    if (!reassignmentData) return;

    try {
      const { itemId, itemType } = reassignmentData;
      
      if (itemType === 'job') {
        const response = await fetch('/api/owner/jobs', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            jobId: itemId,
            action: 'reassign',
            newEmployeeId,
            reason
          })
        });

        if (response.ok) {
          const result = await response.json();
          log.info('Job reassignment successful', { message: result.message, itemId, newEmployeeId, reason });
        } else {
          const error = await response.json();
          log.error('Job reassignment failed', new Error(error.error), { itemId, newEmployeeId, reason });
        }
      } else {
        const response = await fetch('/api/owner/service-requests', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            serviceRequestId: itemId,
            action: 'reassign_technician',
            newTechnicianId: newEmployeeId,
            reason
          })
        });

        if (response.ok) {
          const result = await response.json();
          log.info(result.message);
        } else {
          const error = await response.json();
          log.error('Service request reassignment failed:', error.error);
        }
      }

      fetchJobs(); // Refresh data
      setShowReassignModal(false);
      setReassignmentData(null);
    } catch (error) {
      log.error('Error during reassignment:', error as Error);
    }
  };

  const handleUnassignment = async (reason?: string) => {
    if (!reassignmentData) return;

    try {
      const { itemId, itemType } = reassignmentData;
      
      if (itemType === 'job') {
        const response = await fetch('/api/owner/jobs', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            jobId: itemId,
            action: 'unassign',
            reason
          })
        });

        if (response.ok) {
          const result = await response.json();
          log.info(result.message);
        } else {
          const error = await response.json();
          log.error('Job unassignment failed:', error.error);
        }
      } else {
        const response = await fetch('/api/owner/service-requests', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            serviceRequestId: itemId,
            action: 'unassign_technician',
            reason
          })
        });

        if (response.ok) {
          const result = await response.json();
          log.info(result.message);
        } else {
          const error = await response.json();
          log.error('Service request unassignment failed:', error.error);
        }
      }

      fetchJobs(); // Refresh data
      setShowReassignModal(false);
      setReassignmentData(null);
    } catch (error) {
      log.error('Error during unassignment:', error as Error);
    }
  };

  const openReassignModal = (itemId: string, itemType: 'job' | 'service_request', title: string, currentEmployee?: { id: string; name: string }) => {
    setReassignmentData({
      itemId,
      itemType,
      currentEmployee,
      title
    });
    setShowReassignModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'overloaded':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total Jobs"
            value={statistics.totalJobs.toString()}
            icon={Target}
            color="text-blue-600"
            bgColor="bg-blue-100"
          />
          <StatCard
            title="Scheduled Jobs"
            value={statistics.scheduledJobs.toString()}
            icon={Calendar}
            color="text-purple-600"
            bgColor="bg-purple-100"
          />
          <StatCard
            title="Urgent Jobs"
            value={statistics.urgentJobs.toString()}
            icon={AlertTriangle}
            color="text-red-600"
            bgColor="bg-red-100"
          />
          <StatCard
            title="Avg Job Value"
            value={`$${statistics.averageJobValue.toLocaleString()}`}
            icon={DollarSign}
            color="text-green-600"
            bgColor="bg-green-100"
          />
        </div>
      )}

      {/* Quick Actions & Unassigned Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Unassigned Jobs & Service Requests */}
        {unassignedJobs.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-orange-800 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Needs Attention ({unassignedJobs.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {unassignedJobs.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-white p-3 rounded border-l-4 border-l-orange-400">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-sm font-medium">{item.customerName}</div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        item.itemType === 'service_request' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {item.itemType === 'service_request' ? 'Request' : 'Job'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">{item.serviceType}</div>
                    {item.skillsRequired.length > 0 && (
                      <div className="text-xs text-gray-400">
                        Skills: {item.skillsRequired.slice(0, 2).join(', ')}
                        {item.skillsRequired.length > 2 && ` +${item.skillsRequired.length - 2}`}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 ml-3">
                    {item.itemType === 'service_request' ? (
                      <>
                        <button
                          onClick={() => handleServiceRequestConversion(item.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 bg-blue-50 rounded"
                        >
                          Convert to Job
                        </button>
                        <button
                          onClick={() => handleServiceRequestAssign(item.id)}
                          className="text-green-600 hover:text-green-800 text-xs px-2 py-1 bg-green-50 rounded"
                        >
                          Assign Direct
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleJobAssignment(item.id, 'auto-assign')}
                        className="text-orange-600 hover:text-orange-800 text-xs px-2 py-1 bg-orange-50 rounded"
                      >
                        Auto-assign
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Employee Workload */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Employee Workload
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {employeeWorkload.map(employee => (
              <div key={employee.id} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium">{employee.name}</div>
                  <div className="text-xs text-gray-500">{employee.role}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{employee.activeJobs} jobs</div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAvailabilityColor(employee.availability)}`}>
                    {employee.availability}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Quick Stats
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">This Week:</span>
              <span className="text-sm font-medium">{statistics?.jobsThisWeek} jobs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Active:</span>
              <span className="text-sm font-medium">{statistics?.activeJobs} jobs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Completed:</span>
              <span className="text-sm font-medium">{statistics?.completedJobs} jobs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Job Analytics */}
      {statistics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Job Status Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Status Distribution</h3>
            <PieChart
              data={[
                { name: 'Scheduled', value: statistics.scheduledJobs },
                { name: 'Active', value: statistics.activeJobs },
                { name: 'Completed', value: statistics.completedJobs },
                { name: 'Urgent', value: statistics.urgentJobs }
              ]}
              height={250}
              colors={['#3b82f6', '#f59e0b', '#10b981', '#ef4444']}
            />
          </div>

          {/* Employee Workload Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Workload</h3>
            {employeeWorkload.length > 0 ? (
              <BarChart
                data={employeeWorkload.slice(0, 6).map(emp => ({
                  name: emp.name.split(' ')[0], // First name only for space
                  activeJobs: emp.activeJobs,
                  totalHours: emp.totalHours
                }))}
                xKey="name"
                bars={[
                  { key: 'activeJobs', name: 'Active Jobs', color: '#3b82f6' },
                  { key: 'totalHours', name: 'Total Hours', color: '#10b981' }
                ]}
                height={250}
                layout="vertical"
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No employee workload data available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Jobs Interface */}
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Job Dispatch Board</h2>
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSelectedView('list')}
                  className={`px-3 py-1 text-sm rounded ${selectedView === 'list' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                >
                  List
                </button>
                <button
                  onClick={() => setSelectedView('board')}
                  className={`px-3 py-1 text-sm rounded ${selectedView === 'board' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                >
                  Board
                </button>
                <button
                  onClick={() => setSelectedView('calendar')}
                  className={`px-3 py-1 text-sm rounded ${selectedView === 'calendar' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                >
                  Calendar
                </button>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Job</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7">Next 7 days</option>
              <option value="30">Next 30 days</option>
              <option value="90">Next 90 days</option>
            </select>
          </div>
        </div>

        {/* Jobs List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status & Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Wrench className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {job.serviceType}
                        </div>
                        <div className="text-sm text-gray-500">
                          {job.description ? job.description.substring(0, 50) + '...' : 'No description'}
                        </div>
                        {job.skillsRequired.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {job.skillsRequired.slice(0, 2).map((skill, idx) => (
                              <span key={idx} className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                {skill}
                              </span>
                            ))}
                            {job.skillsRequired.length > 2 && (
                              <span className="text-xs text-gray-500">+{job.skillsRequired.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{job.customerName}</div>
                    {job.customerPhone && (
                      <div className="text-sm text-gray-500 flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {job.customerPhone}
                      </div>
                    )}
                    <div className="text-sm text-gray-500 flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {job.address.length > 30 ? job.address.substring(0, 30) + '...' : job.address}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(job.scheduledDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      {job.estimatedDuration}h estimated
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(job.status)}`}>
                        {job.status.toUpperCase()}
                      </span>
                      <br />
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(job.priority)}`}>
                        {job.priority.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {job.assignedEmployee ? (
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-green-600" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {job.assignedEmployee.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {job.assignedEmployee.role}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">Unassigned</span>
                        <button
                          onClick={() => handleJobAssignment(job.id, 'auto-assign')}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="Auto-assign"
                        >
                          <UserCheck className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="font-medium">${job.totalAmount.toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      {job.assignedEmployee && (
                        <>
                          <button
                            onClick={() => openReassignModal(job.id, 'job', `${job.serviceType} - ${job.customerName}`, job.assignedEmployee)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Reassign Job"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleJobAssignment(job.id, 'unassign')}
                            className="text-red-600 hover:text-red-900"
                            title="Unassign"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {jobs.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No jobs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first job'
              }
            </p>
          </div>
        )}
      </div>

      {/* Add Job Modal Placeholder */}
      {showAddModal && (
        <AddJobModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchJobs();
          }}
        />
      )}

      {/* Job Details Modal Placeholder */}
      {selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdate={() => {
            setSelectedJob(null);
            fetchJobs();
          }}
        />
      )}

      {/* Reassignment Modal */}
      {showReassignModal && reassignmentData && (
        <ReassignmentModal
          data={reassignmentData}
          employees={employeeWorkload}
          onClose={() => {
            setShowReassignModal(false);
            setReassignmentData(null);
          }}
          onReassign={handleReassignment}
          onUnassign={handleUnassignment}
        />
      )}
    </div>
  );
}

// Stats Card Component
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  bgColor 
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow card-hover">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
      </div>
    </div>
  );
}

// Add Job Modal Component (placeholder)
function AddJobModal({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void; 
  onSuccess: () => void; 
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg font-medium text-gray-900">Create New Job</h3>
          <p className="text-sm text-gray-500 mt-2">Job creation form would go here</p>
          <div className="mt-4 flex justify-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={onSuccess}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Job
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Job Details Modal Component (placeholder)
function JobDetailsModal({ 
  job, 
  onClose, 
  onUpdate 
}: { 
  job: Job; 
  onClose: () => void; 
  onUpdate: () => void; 
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900">{job.customerName}</h3>
          <p className="text-sm text-gray-500 mt-2">Job details and management would go here</p>
          <div className="mt-4 flex justify-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Close
            </button>
            <button
              onClick={onUpdate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reassignment Modal Component
function ReassignmentModal({
  data,
  employees,
  onClose,
  onReassign,
  onUnassign
}: {
  data: {
    itemId: string;
    itemType: 'job' | 'service_request';
    currentEmployee?: { id: string; name: string };
    title: string;
  };
  employees: EmployeeWorkload[];
  onClose: () => void;
  onReassign: (newEmployeeId: string, reason?: string) => void;
  onUnassign: (reason?: string) => void;
}) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [reason, setReason] = useState('');
  const [action, setAction] = useState<'reassign' | 'unassign'>('reassign');

  const handleSubmit = () => {
    if (action === 'reassign') {
      if (!selectedEmployeeId) {
        alert('Please select an employee to reassign to');
        return;
      }
      onReassign(selectedEmployeeId, reason || undefined);
    } else {
      onUnassign(reason || undefined);
    }
  };

  const availableEmployees = employees.filter(emp => 
    emp.id !== data.currentEmployee?.id
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Reassign {data.itemType === 'job' ? 'Job' : 'Service Request'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">{data.title}</p>
              {data.currentEmployee && (
                <p className="text-sm text-gray-500">
                  Currently assigned to: <span className="font-medium">{data.currentEmployee.name}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="reassign"
                    checked={action === 'reassign'}
                    onChange={(e) => setAction(e.target.value as 'reassign')}
                    className="mr-2"
                  />
                  Reassign to another employee
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="unassign"
                    checked={action === 'unassign'}
                    onChange={(e) => setAction(e.target.value as 'unassign')}
                    className="mr-2"
                  />
                  Unassign (remove assignment)
                </label>
              </div>
            </div>

            {action === 'reassign' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select New Employee
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose an employee...</option>
                  {availableEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role}) - {emp.availability} ({emp.activeJobs} active jobs)
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain why this reassignment is needed..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className={`px-4 py-2 text-white rounded-md ${
                action === 'reassign' 
                  ? 'bg-orange-600 hover:bg-orange-700' 
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {action === 'reassign' ? 'Reassign' : 'Unassign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}