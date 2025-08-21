'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  ExternalLink,
  User,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ServiceRequestSummary {
  id: string;
  title: string;
  status: string;
  urgencyLevel: string;
  customerName: string;
  createdAt: string;
}

export default function EmployeeServiceRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceRequestId = params.id as string;

  const [serviceRequest, setServiceRequest] = useState<ServiceRequestSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    // Get the auth token from cookies
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('auth_token='))
      ?.split('=')[1];
    
    setAuthToken(token || null);

    if (serviceRequestId) {
      fetchServiceRequestSummary();
    }
  }, [serviceRequestId]);

  const fetchServiceRequestSummary = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/employee/service-requests/${serviceRequestId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setServiceRequest(data.serviceRequest);
      } else {
        console.error('Failed to fetch service request summary');
      }
    } catch (error) {
      console.error('Error fetching service request summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openServicePortal = () => {
    const baseUrl = `http://localhost:3005/service/${serviceRequestId}`;
    const url = authToken 
      ? `${baseUrl}?token=${authToken}&source=employee-portal`
      : `${baseUrl}?source=employee-portal`;
    
    window.open(url, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
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
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!serviceRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Request Not Found</h2>
          <p className="text-gray-600 mb-4">The service request you're looking for doesn't exist or isn't assigned to you.</p>
          <button
            onClick={() => router.back()}
            className="btn-primary"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Service Requests
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Service Request Summary */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{serviceRequest.title}</h1>
            <p className="text-gray-600 mb-4">Service Request ID: {serviceRequest.id}</p>
            
            <div className="flex justify-center items-center space-x-4 mb-6">
              <span className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(serviceRequest.status)}`}>
                {serviceRequest.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`px-4 py-2 text-sm font-semibold rounded-full ${getUrgencyColor(serviceRequest.urgencyLevel)}`}>
                {serviceRequest.urgencyLevel.toUpperCase()} PRIORITY
              </span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center text-gray-700">
                <User className="h-5 w-5 mr-3 text-gray-500" />
                <span>{serviceRequest.customerName}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Clock className="h-5 w-5 mr-3 text-gray-500" />
                <span>Created {formatDate(serviceRequest.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Service Portal Access */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <ExternalLink className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Full Service Portal</h2>
            <p className="text-gray-600 mb-6">
              View complete service request details, add work records, communicate with the customer, 
              and manage all aspects of this service request in the unified service portal.
            </p>
            
            <button
              onClick={openServicePortal}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors duration-200 flex items-center space-x-2 mx-auto"
            >
              <ExternalLink className="h-5 w-5" />
              <span>Open Service Portal</span>
            </button>
            
            <p className="text-sm text-gray-500 mt-4">
              Opens in a new window with your employee authentication
            </p>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push('/employee/service-requests')}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Back to All Service Requests
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}