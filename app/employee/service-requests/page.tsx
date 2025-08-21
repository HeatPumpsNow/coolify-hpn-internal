'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  MessageCircle, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wrench,
  Calendar,
  Camera,
  Mic,
  Eye,
  MessageSquare,
  Settings
} from 'lucide-react';
import { any } from '@/types';

interface ServiceRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  equipmentId?: string;
  equipmentType?: string;
  equipmentName?: string;
  equipmentLocation?: string;
  requestType: string;
  urgencyLevel: string;
  title: string;
  description: string;
  symptoms: string[];
  customerPhotos: string[];
  voiceMemoPath?: string;
  status: string;
  relatedanyId?: string;
  jobStatus?: string;
  jobScheduledDate?: string;
  resolutionNotes?: string;
  customerSatisfactionRating?: number;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  unreadMessages: number;
  latestMessage?: string;
  latestMessageTime?: string;
}

export default function ServiceRequestsPage() {
  const [employee, setany] = useState<any | null>(null);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ServiceRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAddNotes, setShowAddNotes] = useState<string | null>(null);
  const [showResolve, setShowResolve] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [resolutionText, setResolutionText] = useState('');
  const [resolutionRating, setResolutionRating] = useState<number>(5);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [serviceRequests, statusFilter, urgencyFilter]);

  const loadData = async () => {
    try {
      // Load employee session
      const sessionResponse = await fetch('/api/employee/auth/session');
      const sessionData = await sessionResponse.json();
      setany(sessionData.employee);

      // Load service requests
      const requestsResponse = await fetch('/api/employee/service-requests');
      const requestsData = await requestsResponse.json();
      setServiceRequests(requestsData.serviceRequests || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = serviceRequests;

    // Always exclude resolved requests from the main list
    filtered = filtered.filter(request => request.status !== 'resolved');

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(request => request.urgencyLevel === urgencyFilter);
    }

    setFilteredRequests(filtered);
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/employee/service-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'update_status',
          status: newStatus
        }),
      });

      if (response.ok) {
        await loadData();
      } else {
        const errorData = await response.json();
        alert(`Failed to update service request status: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Status update error:', error);
      alert('Failed to update service request status');
    }
  };

  const acknowledgeRequest = async (requestId: string) => {
    await updateRequestStatus(requestId, 'acknowledged');
  };

  const addNotes = async (requestId: string, notes: string) => {
    try {
      const response = await fetch(`/api/employee/service-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'add_notes',
          notes: notes
        }),
      });

      if (response.ok) {
        await loadData();
      } else {
        const errorData = await response.json();
        alert(`Failed to add notes: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Add notes error:', error);
      alert('Failed to add notes');
    }
  };

  const resolveRequest = async (requestId: string, resolutionNotes: string, rating?: number) => {
    try {
      const response = await fetch(`/api/employee/service-requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'resolve',
          resolutionNotes: resolutionNotes,
          customerSatisfactionRating: rating
        }),
      });

      if (response.ok) {
        await loadData();
      } else {
        const errorData = await response.json();
        alert(`Failed to resolve service request: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Resolve error:', error);
      alert('Failed to resolve service request');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const requestStats = {
    total: serviceRequests.filter(r => r.status !== 'resolved').length,
    submitted: serviceRequests.filter(r => r.status === 'submitted').length,
    acknowledged: serviceRequests.filter(r => r.status === 'acknowledged').length,
    inProgress: serviceRequests.filter(r => r.status === 'in_progress').length,
    resolved: serviceRequests.filter(r => r.status === 'resolved').length,
    unreadMessages: serviceRequests.filter(r => r.status !== 'resolved').reduce((sum, r) => sum + r.unreadMessages, 0)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRequestTypeIcon = (requestType: string) => {
    switch (requestType) {
      case 'no_heating':
      case 'no_cooling':
        return <AlertTriangle className="h-5 w-5" />;
      case 'strange_noise':
        return <Wrench className="h-5 w-5" />;
      case 'maintenance':
        return <Settings className="h-5 w-5" />;
      default:
        return <Wrench className="h-5 w-5" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Service Requests</h1>
        <p className="text-gray-600">
          Customer service requests assigned to you.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="card-compact">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{requestStats.total}</h3>
              <p className="text-sm text-gray-600">Total Assigned</p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{requestStats.submitted}</h3>
              <p className="text-sm text-gray-600">New</p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{requestStats.acknowledged}</h3>
              <p className="text-sm text-gray-600">Acknowledged</p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{requestStats.inProgress}</h3>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{requestStats.resolved}</h3>
              <p className="text-sm text-gray-600">Resolved</p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{requestStats.unreadMessages}</h3>
              <p className="text-sm text-gray-600">Unread Messages</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-8">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Active</option>
              <option value="submitted">New</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Priorities</option>
              <option value="emergency">Emergency</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Service Requests List */}
      <div className="space-y-6">
        {filteredRequests.length === 0 ? (
          <div className="card text-center py-8">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No service requests found</h3>
            <p className="text-gray-600">No service requests match your current filters.</p>
          </div>
        ) : (
          filteredRequests.map((request) => (
            <div key={request.id} className="card hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex items-center">
                      {getRequestTypeIcon(request.requestType)}
                      <h3 className="text-lg font-semibold text-gray-900 ml-2">
                        {request.title}
                      </h3>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(request.urgencyLevel)}`}>
                      {request.urgencyLevel} priority
                    </span>
                    {request.unreadMessages > 0 && (
                      <span className="bg-red-100 text-red-800 px-2 py-1 text-xs font-medium rounded-full">
                        {request.unreadMessages} unread
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{request.customerName}</span>
                      {request.customerPhone && (
                        <>
                          <Phone className="w-4 h-4 ml-2" />
                          {request.customerPhone}
                        </>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {request.customerAddress}
                    </div>

                    {request.equipmentName && (
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        {request.equipmentName}
                        {request.equipmentLocation && ` - ${request.equipmentLocation}`}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Created {formatDate(request.createdAt)}
                      {request.jobScheduledDate && (
                        <span className="ml-2 text-blue-600">
                          • any scheduled: {formatDate(request.jobScheduledDate)}
                        </span>
                      )}
                    </div>

                    {request.customerPhotos.length > 0 && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Camera className="w-4 h-4" />
                        {request.customerPhotos.length} photos attached
                      </div>
                    )}

                    {request.voiceMemoPath && (
                      <div className="flex items-center gap-2 text-purple-600">
                        <Mic className="w-4 h-4" />
                        Voice memo attached
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded mb-4">
                    {request.description}
                  </p>

                  {request.symptoms.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Reported Symptoms:</h4>
                      <div className="flex flex-wrap gap-2">
                        {request.symptoms.map((symptom, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"
                          >
                            {symptom}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {request.latestMessage && (
                    <div className="border-t pt-3 mt-3">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 line-clamp-2">{request.latestMessage}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {request.latestMessageTime && formatDate(request.latestMessageTime)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  {request.status === 'submitted' && (
                    <button
                      onClick={() => acknowledgeRequest(request.id)}
                      className="btn-primary text-sm"
                    >
                      Acknowledge
                    </button>
                  )}
                  
                  {request.status === 'acknowledged' && (
                    <button
                      onClick={() => updateRequestStatus(request.id, 'in_progress')}
                      className="btn-primary text-sm"
                    >
                      Start Work
                    </button>
                  )}
                  
                  {request.status === 'in_progress' && (
                    <button
                      onClick={() => setShowResolve(request.id)}
                      className="btn-success text-sm"
                    >
                      Mark Resolved
                    </button>
                  )}

                  {(request.status === 'acknowledged' || request.status === 'in_progress') && (
                    <button
                      onClick={() => setShowAddNotes(request.id)}
                      className="btn-outline text-sm flex items-center gap-2"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Add Notes
                    </button>
                  )}

                  <Link 
                    href={`/employee/messages?serviceRequest=${request.id}`}
                    className="btn-secondary text-sm text-center flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                    {request.unreadMessages > 0 && (
                      <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                        {request.unreadMessages}
                      </span>
                    )}
                  </Link>

                  <button
                    onClick={() => {
                      // Get auth token from cookies to pass to service portal
                      const authToken = document.cookie
                        .split('; ')
                        .find(row => row.startsWith('auth_token_js='))
                        ?.split('=')[1];
                      
                      const url = authToken 
                        ? `http://localhost:3005/service/${request.id}?token=${authToken}`
                        : `http://localhost:3005/service/${request.id}`;
                      
                      window.open(url, '_blank');
                    }}
                    className="btn-outline text-sm flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Notes Modal */}
      {showAddNotes && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Notes</h3>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Add technical notes, findings, or updates..."
              />
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowAddNotes(null);
                    setNoteText('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (noteText.trim()) {
                      await addNotes(showAddNotes, noteText);
                      setShowAddNotes(null);
                      setNoteText('');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Service Request Modal */}
      {showResolve && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resolve Service Request</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resolution Notes (Required)
                  </label>
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Describe what was done to resolve the issue..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Customer Satisfaction (1-5)
                  </label>
                  <select
                    value={resolutionRating}
                    onChange={(e) => setResolutionRating(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={5}>5 - Excellent</option>
                    <option value={4}>4 - Good</option>
                    <option value={3}>3 - Average</option>
                    <option value={2}>2 - Poor</option>
                    <option value={1}>1 - Very Poor</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowResolve(null);
                    setResolutionText('');
                    setResolutionRating(5);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (resolutionText.trim()) {
                      await resolveRequest(showResolve, resolutionText, resolutionRating);
                      setShowResolve(null);
                      setResolutionText('');
                      setResolutionRating(5);
                    }
                  }}
                  disabled={!resolutionText.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Request Details Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{selectedRequest.title}</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Customer Information</h4>
                  <p className="text-sm text-gray-600">
                    {selectedRequest.customerName} • {selectedRequest.customerPhone} • {selectedRequest.customerEmail}
                  </p>
                  <p className="text-sm text-gray-600">{selectedRequest.customerAddress}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900">Description</h4>
                  <p className="text-sm text-gray-600">{selectedRequest.description}</p>
                </div>

                {selectedRequest.resolutionNotes && (
                  <div>
                    <h4 className="font-medium text-gray-900">Resolution Notes</h4>
                    <p className="text-sm text-gray-600">{selectedRequest.resolutionNotes}</p>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}