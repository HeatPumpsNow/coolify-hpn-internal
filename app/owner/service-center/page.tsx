'use client';

import { useState, useEffect } from 'react';
import { log } from '@/../../shared/utils';
import { 
  Headphones,
  AlertTriangle,
  Clock,
  CheckCircle,
  Calendar,
  Plus,
  User,
  Phone,
  Mail,
  MapPin,
  Zap,
  MessageSquare,
  Search,
  RefreshCw,
  ClipboardList,
  UserPlus,
  X,
  RotateCcw,
  UserX
} from 'lucide-react';

interface ServiceTicket {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  requestType: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency';
  title: string;
  description: string;
  status: 'submitted' | 'acknowledged' | 'assigned' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  daysPending: number;
  assignedTo?: string;
}

interface ServiceStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  emergency: number;
  averageResponseTime: number;
  resolvedToday: number;
  customerSatisfaction: number;
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
}

type TabType = 'tickets' | 'create';

export default function ServiceCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
  const [stats, setStats] = useState<ServiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assigningTicketId, setAssigningTicketId] = useState<string | null>(null);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassignmentData, setReassignmentData] = useState<{
    ticketId: string;
    title: string;
    currentEmployee?: { id: string; name: string };
  } | null>(null);

  useEffect(() => {
    fetchServiceData();
    fetchEmployees();
  }, [activeTab, statusFilter, urgencyFilter, searchTerm]);

  const fetchServiceData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        type: 'tickets', // Only fetch service tickets (issues/problems)
        status: statusFilter,
        urgency: urgencyFilter,
        search: searchTerm
      });

      const response = await fetch(`/api/owner/service-requests?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        
        // Transform API data to match component interface
        const transformedTickets = (data.serviceRequests || []).map((ticket: any) => ({
          id: ticket.id,
          customerName: ticket.customerName,
          customerEmail: ticket.customerEmail,
          customerPhone: ticket.customerPhone,
          address: ticket.customerAddress, // Map customerAddress to address
          requestType: ticket.requestType,
          urgencyLevel: ticket.urgencyLevel,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          daysPending: ticket.daysPending,
          assignedTo: ticket.technicianName
        }));
        
        // Transform stats to match interface
        const transformedStats = data.statistics ? {
          total: data.statistics.totalRequests,
          pending: data.statistics.submittedRequests + data.statistics.acknowledgedRequests,
          inProgress: data.statistics.inProgressRequests,
          resolved: data.statistics.resolvedRequests,
          emergency: data.statistics.emergencyRequests,
          averageResponseTime: data.statistics.averageResolutionDays || 0,
          resolvedToday: 0, // Not provided by API
          customerSatisfaction: 4.2 // Not provided by API, default value
        } : null;
        
        setServiceTickets(transformedTickets);
        setStats(transformedStats);
      } else {
        log.error('Failed to fetch service tickets');
      }
    } catch (error) {
      log.error('Error fetching service tickets:', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/owner/employees', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      } else {
        log.error('Failed to fetch employees');
      }
    } catch (error) {
      log.error('Error fetching employees:', error as Error);
    }
  };

  const handleAssignEmployee = async (serviceRequestId: string, employeeId: string) => {
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
          technicianId: employeeId
        })
      });

      if (response.ok) {
        setAssigningTicketId(null);
        fetchServiceData();
        log.info('Employee assigned successfully');
      } else {
        const error = await response.json();
        log.error('Assignment failed:', error.error);
      }
    } catch (error) {
      log.error('Error assigning employee:', error as Error);
    }
  };

  const handleReassignment = async (newEmployeeId: string, reason?: string) => {
    if (!reassignmentData) return;

    try {
      const response = await fetch('/api/owner/service-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          serviceRequestId: reassignmentData.ticketId,
          action: 'reassign_technician',
          newTechnicianId: newEmployeeId,
          reason
        })
      });

      if (response.ok) {
        setShowReassignModal(false);
        setReassignmentData(null);
        fetchServiceData();
        log.info('Service request reassigned successfully');
      } else {
        const error = await response.json();
        log.error('Reassignment failed:', error.error);
      }
    } catch (error) {
      log.error('Error during reassignment:', error as Error);
    }
  };

  const handleUnassignment = async (reason?: string) => {
    if (!reassignmentData) return;

    try {
      const response = await fetch('/api/owner/service-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          serviceRequestId: reassignmentData.ticketId,
          action: 'unassign_technician',
          reason
        })
      });

      if (response.ok) {
        setShowReassignModal(false);
        setReassignmentData(null);
        fetchServiceData();
        log.info('Service request unassigned successfully');
      } else {
        const error = await response.json();
        log.error('Unassignment failed:', error.error);
      }
    } catch (error) {
      log.error('Error during unassignment:', error as Error);
    }
  };

  const openReassignModal = (ticketId: string, title: string, currentEmployee?: { id: string; name: string }) => {
    setReassignmentData({
      ticketId,
      title,
      currentEmployee
    });
    setShowReassignModal(true);
  };

  const handleConvertToJob = async (serviceRequestId: string) => {
    try {
      const response = await fetch('/api/owner/service-requests/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          serviceRequestId,
          scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          estimatedDuration: 4,
          priority: 'medium'
        })
      });

      if (response.ok) {
        fetchServiceData();
        log.info('Service request converted to job successfully');
      } else {
        const error = await response.json();
        log.error('Conversion failed:', error.error);
      }
    } catch (error) {
      log.error('Error converting service request:', error as Error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'acknowledged':
        return 'bg-purple-100 text-purple-800';
      case 'assigned':
        return 'bg-indigo-100 text-indigo-800';
      case 'in-progress':
        return 'bg-amber-100 text-amber-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRequestTypeDisplay = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'no_heating': 'No Heating',
      'no_cooling': 'No Cooling', 
      'strange_noise': 'Strange Noise',
      'high_bills': 'High Energy Bills',
      'poor_air_quality': 'Poor Air Quality',
      'maintenance': 'Maintenance',
      'installation': 'Installation',
      'annual_service': 'Annual Service',
      'filter_change': 'Filter Change',
      'system_checkup': 'System Checkup',
      'warranty_service': 'Warranty Service',
      'other': 'Other'
    };
    return typeMap[type] || type;
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Headphones className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Center</h1>
              <p className="text-gray-600">Manage customer service tickets, issues, and support requests</p>
            </div>
          </div>
          <button
            onClick={fetchServiceData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Tickets"
              value={stats.total.toString()}
              subtitle={`${stats.pending} pending`}
              icon={ClipboardList}
              color="text-blue-600"
              bgColor="bg-blue-100"
            />
            <StatCard
              title="Emergency"
              value={stats.emergency.toString()}
              subtitle="requires immediate attention"
              icon={AlertTriangle}
              color="text-red-600"
              bgColor="bg-red-100"
            />
            <StatCard
              title="In Progress"
              value={stats.inProgress.toString()}
              subtitle="being worked on"
              icon={Clock}
              color="text-yellow-600"
              bgColor="bg-yellow-100"
            />
            <StatCard
              title="Resolved Today"
              value={stats.resolvedToday.toString()}
              subtitle={`${stats.averageResponseTime}h avg response`}
              icon={CheckCircle}
              color="text-green-600"
              bgColor="bg-green-100"
            />
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tickets'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Service Tickets</span>
                {stats && (
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
                    {stats.pending}
                  </span>
                )}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('create')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'create'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Create New Ticket</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'create' ? (
            <CreateTicketForm onSuccess={fetchServiceData} />
          ) : (
            <>
              {/* Filters */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search service tickets..."
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
                  <option value="all">All Active</option>
                  <option value="submitted">Submitted</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="assigned">Assigned</option>
                  <option value="in-progress">In Progress</option>
                </select>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Urgency</option>
                  <option value="emergency">Emergency</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              {/* Service Tickets List */}
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading service tickets...</p>
                </div>
              ) : serviceTickets.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No service tickets found
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'all' || urgencyFilter !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'All service tickets have been resolved'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {serviceTickets.map((ticket) => (
                    <ServiceTicketCard
                      key={ticket.id}
                      ticket={ticket}
                      employees={employees}
                      onConvertToJob={handleConvertToJob}
                      onAssignEmployee={handleAssignEmployee}
                      onReassign={openReassignModal}
                      assigningTicketId={assigningTicketId}
                      setAssigningTicketId={setAssigningTicketId}
                      getUrgencyColor={getUrgencyColor}
                      getStatusColor={getStatusColor}
                      getRequestTypeDisplay={getRequestTypeDisplay}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reassignment Modal */}
      {showReassignModal && reassignmentData && (
        <ServiceRequestReassignmentModal
          data={reassignmentData}
          employees={employees}
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

function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  color, 
  bgColor 
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-full ${bgColor}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
    </div>
  );
}

function ServiceTicketCard({
  ticket,
  employees,
  onConvertToJob,
  onAssignEmployee,
  onReassign,
  assigningTicketId,
  setAssigningTicketId,
  getUrgencyColor,
  getStatusColor,
  getRequestTypeDisplay
}: {
  ticket: ServiceTicket;
  employees: Employee[];
  onConvertToJob: (id: string) => void;
  onAssignEmployee: (ticketId: string, employeeId: string) => void;
  onReassign: (ticketId: string, title: string, currentEmployee?: { id: string; name: string }) => void;
  assigningTicketId: string | null;
  setAssigningTicketId: (id: string | null) => void;
  getUrgencyColor: (urgency: string) => string;
  getStatusColor: (status: string) => string;
  getRequestTypeDisplay: (type: string) => string;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:bg-gray-100 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h4 className="text-lg font-semibold text-gray-900">{ticket.title}</h4>
            </div>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getUrgencyColor(ticket.urgencyLevel)}`}>
              {ticket.urgencyLevel.toUpperCase()}
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
              {ticket.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Customer & Service Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span className="font-medium">{ticket.customerName}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Mail className="h-4 w-4" />
                <span>{ticket.customerEmail}</span>
              </div>
              {ticket.customerPhone && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{ticket.customerPhone}</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{ticket.address}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Zap className="h-4 w-4" />
                <span>{getRequestTypeDisplay(ticket.requestType)}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>{ticket.daysPending} days ago</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-4 line-clamp-2">{ticket.description}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-2 ml-4">
          {/* Show assigned employee if assigned */}
          {ticket.assignedTo && (
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-800 text-sm rounded-lg">
              <User className="h-4 w-4" />
              <span>Assigned to {ticket.assignedTo}</span>
            </div>
          )}
          
          {/* Assignment dropdown */}
          {assigningTicketId === ticket.id ? (
            <div className="relative">
              <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-48">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Assign to:</span>
                  <button
                    onClick={() => setAssigningTicketId(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {employees.map((employee) => (
                    <button
                      key={employee.id}
                      onClick={() => onAssignEmployee(ticket.id, employee.id)}
                      className="w-full text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
                    >
                      {employee.fullName || `${employee.firstName} ${employee.lastName}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Assign Employee Button */}
              {!ticket.assignedTo && (
                <button
                  onClick={() => setAssigningTicketId(ticket.id)}
                  className="flex items-center space-x-2 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Assign Employee</span>
                </button>
              )}

              {/* Reassignment Buttons - Show if assigned */}
              {ticket.assignedTo && (
                <button
                  onClick={() => onReassign(
                    ticket.id, 
                    ticket.title, 
                    { id: 'current', name: ticket.assignedTo || '' }
                  )}
                  className="flex items-center space-x-2 px-3 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reassign</span>
                </button>
              )}
              
              {/* Schedule Job Button */}
              {(ticket.status === 'submitted' || ticket.status === 'acknowledged') && (
                <button
                  onClick={() => onConvertToJob(ticket.id)}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Schedule Job</span>
                </button>
              )}
            </>
          )}
          
          <button 
            onClick={() => {
              // Get auth token from cookies to pass to service portal
              log.info('Debug: All cookies:', { cookies: document.cookie });
              const authToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('owner_token_js='))
                ?.split('=')[1];
              
              log.info('Debug: Auth token found:', { found: authToken ? 'YES' : 'NO' });
              log.info('Debug: Token length:', { length: authToken?.length || 0 });
              
              const url = authToken 
                ? `http://localhost:3005/service/${ticket.id}?token=${authToken}`
                : `http://localhost:3005/service/${ticket.id}`;
              
              log.info('Debug: Opening URL:', { url });
              window.open(url, '_blank');
            }}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
          >
            <MessageSquare className="h-4 w-4" />
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateTicketForm({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    address: '',
    requestType: '',
    urgencyLevel: 'medium',
    title: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implementation for creating new service request
    log.info('Creating new request:', formData);
    onSuccess();
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6 p-4 border-2 border-red-500 bg-red-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-red-900">Create New Service Ticket</h3>
            <p className="text-sm text-red-700">For customer issues, problems, and support requests</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Customer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer Name</label>
            <input
              type="text"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({...formData, customerName: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              value={formData.customerEmail}
              onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Service Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Request Type</label>
            <select
              required
              value={formData.requestType}
              onChange={(e) => setFormData({...formData, requestType: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select issue type...</option>
              <option value="no_heating">No Heating</option>
              <option value="no_cooling">No Cooling</option>
              <option value="strange_noise">Strange Noise</option>
              <option value="high_bills">High Energy Bills</option>
              <option value="poor_air_quality">Poor Air Quality</option>
              <option value="system_malfunction">System Malfunction</option>
              <option value="warranty_claim">Warranty Claim</option>
              <option value="other">Other Issue</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Urgency Level
            </label>
            <select
              value={formData.urgencyLevel}
              onChange={(e) => setFormData({...formData, urgencyLevel: e.target.value})}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low - Can wait a few days</option>
              <option value="medium">Medium - Should be addressed soon</option>
              <option value="high">High - Needs attention within 24 hours</option>
              <option value="emergency">Emergency - Immediate attention required</option>
            </select>
          </div>
        </div>


        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Brief description of the issue"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={4}
            required
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Please provide detailed information about the issue, including when it started, any error messages, and what the customer has already tried..."
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Service Ticket
          </button>
        </div>
      </form>
    </div>
  );
}

// Service Request Reassignment Modal Component
function ServiceRequestReassignmentModal({
  data,
  employees,
  onClose,
  onReassign,
  onUnassign
}: {
  data: {
    ticketId: string;
    title: string;
    currentEmployee?: { id: string; name: string };
  };
  employees: Employee[];
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
    emp.fullName !== data.currentEmployee?.name && 
    `${emp.firstName} ${emp.lastName}` !== data.currentEmployee?.name
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Reassign Service Request
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
                      {emp.fullName || `${emp.firstName} ${emp.lastName}`} ({emp.role})
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