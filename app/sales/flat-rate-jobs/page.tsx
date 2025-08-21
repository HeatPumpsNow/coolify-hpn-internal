'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface FlatRateJob {
  id: string;
  name: string;
  description: string;
  duration_hours: number;
  flat_rate_price: number;
  includes_materials: boolean;
  includes_permit: boolean;
  included_services: string[];
  common_parts: any[];
  labor_hours: number;
  use_conditions: string[];
  not_suitable_when: string[];
  scope_limitations: string;
  safety_margin: number;
  active: boolean;
}

interface FlatRateJobsData {
  jobs_by_type: {
    emergency_repair: FlatRateJob[];
    basic_replacement: FlatRateJob[];
    maintenance: FlatRateJob[];
  };
  usage_guidelines: {
    emergency_repair: string;
    basic_replacement: string;
    maintenance: string;
  };
}

export default function FlatRateJobsPage() {
  const [jobsData, setJobsData] = useState<FlatRateJobsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedJobType, setSelectedJobType] = useState<'emergency_repair' | 'basic_replacement' | 'maintenance'>('emergency_repair');
  const [showCustomerForm, setShowCustomerForm] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchFlatRateJobs();
  }, []);

  const fetchFlatRateJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/flat-rate-jobs', {
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setJobsData(data.data);
      } else {
        setError(data.error?.message || 'Failed to fetch flat rate jobs');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching flat rate jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEstimation = async (jobId: string) => {
    setProcessing(true);
    
    try {
      const response = await fetch('/api/flat-rate-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          flat_rate_job_id: jobId,
          customer_info: customerInfo,
          notes: notes
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Redirect to the created estimation
        window.location.href = `/estimation/${data.data.estimation_id}`;
      } else {
        alert(data.error?.message || 'Failed to create flat rate estimation');
      }
    } catch (err) {
      alert('Network error. Please try again.');
      console.error('Error creating flat rate estimation:', err);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getJobTypeColor = (type: string) => {
    const colors = {
      emergency_repair: 'bg-red-100 text-red-800 border-red-200',
      basic_replacement: 'bg-blue-100 text-blue-800 border-blue-200',
      maintenance: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading flat rate jobs...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Flat Rate Jobs</h1>
          <p className="text-gray-600 mt-2">
            Emergency repairs and simple changeouts with fixed pricing. Separate from custom installation workflow.
          </p>
        </div>

        {/* Key Information Banner */}
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-lg font-medium text-yellow-800 mb-2">Flat Rate Job Guidelines</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li><strong>Emergency Repairs:</strong> System failures requiring immediate attention - fixed scope, no customization</li>
                <li><strong>Basic Replacements:</strong> Simple like-for-like equipment replacement - no system modifications</li>
                <li><strong>Maintenance:</strong> Routine maintenance and tune-ups - preventive care only</li>
                <li><strong>Separate Workflow:</strong> These are NOT custom installations - they have predetermined scope and pricing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Job Type Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8">
              {(['emergency_repair', 'basic_replacement', 'maintenance'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedJobType(type)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    selectedJobType === type
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  {jobsData && (
                    <span className="ml-2 px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                      {jobsData.jobs_by_type[type].length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Usage Guidelines for Selected Type */}
        {jobsData && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">
              {selectedJobType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Guidelines:
            </h4>
            <p className="text-sm text-blue-700">
              {jobsData.usage_guidelines[selectedJobType]}
            </p>
          </div>
        )}

        {/* Jobs Grid */}
        {jobsData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobsData.jobs_by_type[selectedJobType].map((job) => (
              <Card key={job.id} className="relative">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{job.name}</CardTitle>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getJobTypeColor(selectedJobType)}`}>
                      {job.duration_hours}h
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-gray-600 text-sm mb-4">{job.description}</p>
                  
                  {/* Pricing */}
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-800">
                        {formatCurrency(job.flat_rate_price)}
                      </div>
                      <div className="text-xs text-green-600">All-inclusive flat rate</div>
                    </div>
                  </div>

                  {/* What's Included */}
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">Includes:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {job.included_services.map((service, idx) => (
                        <li key={idx} className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {service}
                        </li>
                      ))}
                      {job.includes_materials && (
                        <li className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Materials included
                        </li>
                      )}
                      {job.includes_permit && (
                        <li className="flex items-center">
                          <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Permit included
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Scope Limitations */}
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
                    <h5 className="font-medium text-gray-700 text-sm mb-1">Scope Limitations:</h5>
                    <p className="text-xs text-gray-600">{job.scope_limitations}</p>
                  </div>

                  {/* Action Button */}
                  <Button
                    onClick={() => setShowCustomerForm(job.id)}
                    className="w-full"
                    disabled={!job.active}
                  >
                    {!job.active ? 'Unavailable' : 'Create Flat Rate Estimation'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Customer Information Modal */}
        {showCustomerForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Customer Information
                  </h3>
                  <button
                    onClick={() => {
                      setShowCustomerForm(null);
                      setCustomerInfo({ name: '', email: '', phone: '', address: '' });
                      setNotes('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateEstimation(showCustomerForm);
                }} className="space-y-4">
                  <Input
                    label="Customer Name"
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    placeholder="John Smith"
                    required
                  />
                  
                  <Input
                    label="Email"
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    placeholder="john.smith@example.com"
                  />
                  
                  <Input
                    label="Phone"
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    required
                  />
                  
                  <Input
                    label="Address"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                    placeholder="123 Main St, Austin, TX 78701"
                    required
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Additional notes about this job..."
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCustomerForm(null);
                        setCustomerInfo({ name: '', email: '', phone: '', address: '' });
                        setNotes('');
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      loading={processing}
                      className="flex-1"
                    >
                      {processing ? 'Creating...' : 'Create Estimation'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}