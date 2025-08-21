'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Settings,
  DollarSign,
  Wrench,
  Star,
  Activity,
  Home,
  MessageSquare,
  Clock
} from 'lucide-react';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    full: string;
  };
  totalJobs: number;
  totalSpent: number;
  lastJobDate?: string;
  status: string;
  customerSince: string;
  notes?: string;
  averageRating?: string;
  activeJobs: number;
  upcomingJobs: number;
  lifeCycleStage: string;
}

interface ServiceRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  urgencyLevel: string;
  createdAt: string;
  equipmentName?: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
  scheduledDate: string;
  totalAmount?: number;
  description: string;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'service-requests' | 'jobs' | 'notes'>('overview');

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
      fetchServiceRequests();
      fetchJobs();
    }
  }, [customerId]);

  const fetchCustomerDetails = async () => {
    try {
      const response = await fetch(`/api/owner/customers/${customerId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCustomer(data.customer);
      } else {
        console.error('Failed to fetch customer details');
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchServiceRequests = async () => {
    try {
      const response = await fetch(`/api/owner/customers/${customerId}/service-requests`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setServiceRequests(data.serviceRequests || []);
      }
    } catch (error) {
      console.error('Error fetching service requests:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await fetch(`/api/owner/customers/${customerId}/jobs`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'submitted':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Customer Details...</h2>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <UserCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Customer Not Found</h2>
          <p className="text-gray-500">The customer you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">
                    {customer.firstName[0]}{customer.lastName[0]}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{customer.fullName}</h1>
                  <p className="text-gray-600">Customer since {new Date(customer.customerSince).toLocaleDateString()}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                      {customer.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500 capitalize">
                      {customer.lifeCycleStage} customer
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">${customer.totalSpent.toLocaleString()}</div>
                <div className="text-sm text-gray-500">Total Spent</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Wrench className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{customer.totalJobs}</p>
                <p className="text-sm text-gray-600">Jobs Completed</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{customer.activeJobs}</p>
                <p className="text-sm text-gray-600">Active Jobs</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{customer.upcomingJobs}</p>
                <p className="text-sm text-gray-600">Upcoming Jobs</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {customer.averageRating || 'N/A'}
                </p>
                <p className="text-sm text-gray-600">Avg Rating</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: Home },
                { id: 'service-requests', name: 'Service Requests', icon: MessageSquare },
                { id: 'jobs', name: 'Job History', icon: Wrench },
                { id: 'notes', name: 'Notes', icon: FileText }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contact Information */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-400" />
                        <span className="text-gray-900">{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center space-x-3">
                          <Phone className="h-5 w-5 text-gray-400" />
                          <span className="text-gray-900">{customer.phone}</span>
                        </div>
                      )}
                      <div className="flex items-start space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-gray-900">{customer.address.street}</p>
                          <p className="text-gray-600">
                            {customer.address.city}, {customer.address.state} {customer.address.zip}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Service Summary */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Jobs:</span>
                        <span className="font-semibold">{customer.totalJobs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Spent:</span>
                        <span className="font-semibold text-green-600">${customer.totalSpent.toLocaleString()}</span>
                      </div>
                      {customer.lastJobDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Last Service:</span>
                          <span className="font-semibold">{new Date(customer.lastJobDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Customer Since:</span>
                        <span className="font-semibold">{new Date(customer.customerSince).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-3">
                    {serviceRequests.slice(0, 3).map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{request.title}</h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{request.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'service-requests' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Service Requests</h3>
                {serviceRequests.length === 0 ? (
                  <p className="text-gray-500">No service requests found.</p>
                ) : (
                  <div className="space-y-3">
                    {serviceRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{request.title}</h4>
                          <div className="flex space-x-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${getUrgencyColor(request.urgencyLevel)}`}>
                              {request.urgencyLevel}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(request.status)}`}>
                              {request.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{request.description}</p>
                        {request.equipmentName && (
                          <p className="text-sm text-gray-500">Equipment: {request.equipmentName}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          Created: {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Job History</h3>
                {jobs.length === 0 ? (
                  <p className="text-gray-500">No jobs found.</p>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{job.title}</h4>
                          <div className="flex items-center space-x-2">
                            {job.totalAmount && (
                              <span className="text-green-600 font-semibold">
                                ${job.totalAmount.toLocaleString()}
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(job.status)}`}>
                              {job.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{job.description}</p>
                        <p className="text-xs text-gray-500">
                          Scheduled: {new Date(job.scheduledDate).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Customer Notes</h3>
                {customer.notes ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">{customer.notes}</p>
                  </div>
                ) : (
                  <p className="text-gray-500">No notes available for this customer.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}