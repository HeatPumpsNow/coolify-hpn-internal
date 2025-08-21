'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AIQuoteAssistant, AIUtils } from '@/lib/ai-assistant';
import SalesPortalHeader from '@/components/SalesPortalHeader';

interface EstimationProject {
  id: string;
  project_number: string;
  project_name: string;
  quote_type: string;
  status: string;
  total_project_cost: number;
  calculated_margin_percentage: number;
  margin_status: 'good' | 'acceptable' | 'low' | 'critical';
  flat_rate_mode: boolean;
  template_applied?: string;
  phase_count: number;
  line_item_count: number;
  customer_info?: {
    first_name: string;
    last_name: string;
  };
  lead_number?: string;
  rep_first_name: string;
  rep_last_name: string;
  created_at: string;
  updated_at: string;
  last_calculated_at: string;
}

interface CreateEstimationData {
  project_name: string;
  lead_id?: string;
  customer_info: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  start_with_testing: boolean;
  property_type: 'single_family' | 'multi_family' | 'commercial';
  approximate_sqft?: number;
  notes?: string;
}

const PROPERTY_TYPES = [
  { value: 'single_family', label: 'Single Family Home' },
  { value: 'multi_family', label: 'Multi-Family / Duplex' },
  { value: 'commercial', label: 'Commercial Property' },
];

const QUOTE_TYPES = [
  { value: 'custom', label: 'Custom Solution' },
  { value: 'heat_pump_installation', label: 'Heat Pump Installation' },
  { value: 'heat_pump_replacement', label: 'Heat Pump Replacement' },
  { value: 'ductwork_replacement', label: 'Ductwork Replacement' },
  { value: 'system_upgrade', label: 'System Upgrade' },
  { value: 'maintenance_contract', label: 'Maintenance Contract' },
];

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  converted_to_quote: 'bg-purple-100 text-purple-800',
  archived: 'bg-red-100 text-red-800',
};

const MARGIN_STATUS_COLORS = {
  good: 'text-green-600',
  acceptable: 'text-yellow-600',
  low: 'text-orange-600',
  critical: 'text-red-600',
};

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function EstimationPage() {
  const [user, setUser] = useState<User | null>(null);
  const [estimations, setEstimations] = useState<EstimationProject[]>([]);
  const [filteredEstimations, setFilteredEstimations] = useState<EstimationProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [quoteTypeFilter, setQuoteTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create form data
  const [createData, setCreateData] = useState<CreateEstimationData>({
    project_name: '',
    customer_info: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
    },
    start_with_testing: true,
    property_type: 'single_family',
    approximate_sqft: undefined,
    notes: '',
  });

  const router = useRouter();

  useEffect(() => {
    // Check authentication and set user
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchEstimations();
    checkAIAvailability();
  }, [router]);

  const checkAIAvailability = async () => {
    try {
      const available = await AIQuoteAssistant.checkAvailability();
      setAiAvailable(available);
    } catch (error) {
      console.error('AI availability check failed:', error);
      setAiAvailable(false);
    }
  };

  useEffect(() => {
    // Apply filters
    let filtered = estimations;

    if (statusFilter) {
      filtered = filtered.filter(est => est.status === statusFilter);
    }

    if (quoteTypeFilter) {
      filtered = filtered.filter(est => est.quote_type === quoteTypeFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(est =>
        est.project_name.toLowerCase().includes(term) ||
        est.project_number.toLowerCase().includes(term) ||
        (est.customer_info?.first_name?.toLowerCase().includes(term)) ||
        (est.customer_info?.last_name?.toLowerCase().includes(term)) ||
        (est.lead_number?.toLowerCase().includes(term))
      );
    }

    setFilteredEstimations(filtered);
  }, [estimations, statusFilter, quoteTypeFilter, searchTerm]);

  const fetchEstimations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/estimations?limit=50', {
        credentials: 'include',
      });
      const data = await response.json();
      
      if (data.success) {
        setEstimations(data.data.estimations);
      } else {
        setError(data.error?.message || 'Failed to fetch estimations');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching estimations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAIExtractFromNotes = async () => {
    if (!createData.notes?.trim() || aiProcessing) return;
    
    setAiProcessing(true);
    
    try {
      const extracted = await AIQuoteAssistant.parseProjectDescription(createData.notes);
      
      // Auto-fill fields that have confidence and aren't already filled
      const updates: Partial<typeof createData> = {};
      
      if (extracted.squareFootage && !createData.approximate_sqft) {
        updates.approximate_sqft = extracted.squareFootage;
      }
      
      // Suggest project name if not already filled
      if (!createData.project_name && createData.customer_info.first_name && createData.customer_info.last_name) {
        const projectType = extracted.projectType === 'replacement' ? 'Heat Pump Replacement' : 
                           extracted.projectType === 'new_installation' ? 'Heat Pump Installation' : 
                           'Heat Pump Solution';
        updates.project_name = `${createData.customer_info.first_name} ${createData.customer_info.last_name} ${projectType}`;
      }
      
      // Determine if should start with testing based on complexity
      if (extracted.complexityFactors && extracted.complexityFactors.length > 2) {
        updates.start_with_testing = true;
      }
      
      // Apply updates
      if (Object.keys(updates).length > 0) {
        setCreateData(prev => ({ ...prev, ...updates }));
        
        // Show success message with extracted info
        const extractedInfo = [];
        if (extracted.squareFootage) extractedInfo.push(`${extracted.squareFootage} sq ft`);
        if (extracted.systemSize) extractedInfo.push(extracted.systemSize);
        if (extracted.projectType) extractedInfo.push(extracted.projectType);
        if (extracted.urgency) extractedInfo.push(`${extracted.urgency} urgency`);
        
        alert(`AI extracted: ${extractedInfo.join(', ')} from notes`);
      } else {
        alert('AI could not extract new information from the notes');
      }
      
    } catch (error) {
      console.error('AI extraction failed:', error);
      alert('AI unavailable - please fill fields manually');
    } finally {
      setAiProcessing(false);
    }
  };

  const handleCreateEstimation = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setError('');

    try {
      // Transform frontend data to match API schema
      const apiData = {
        project_name: createData.project_name,
        quote_type: 'custom', // Default to custom (matches database constraint)
        customer_requirements: {
          customer_info: createData.customer_info,
          property_type: createData.property_type,
          approximate_sqft: createData.approximate_sqft,
          start_with_testing: createData.start_with_testing,
          notes: createData.notes,
        },
        site_conditions: {
          property_type: createData.property_type,
          approximate_sqft: createData.approximate_sqft,
        },
        overhead_percentage: 15,
        target_margin_percentage: 35,
        risk_buffer_percentage: 5,
        apply_template: false, // Don't apply template for custom solutions
        flat_rate_mode: false,
      };

      const response = await fetch('/api/estimations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(apiData),
      });

      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        router.push(`/estimation/${data.data.id}`);
      } else {
        setError(data.error?.message || 'Failed to create estimation');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error creating estimation:', err);
    } finally {
      setCreateLoading(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysAgo = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    return days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading estimation system...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SalesPortalHeader user={user} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Custom Solution Designer</h1>
                <p className="text-gray-600">Testing-driven custom heat pump solutions tailored to each home's needs</p>
              </div>
              <Button onClick={() => setShowCreateModal(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Start New Assessment
              </Button>
            </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              label="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, number, or customer..."
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="in_progress">In Progress</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="converted_to_quote">Converted to Quote</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quote Type</label>
              <select
                value={quoteTypeFilter}
                onChange={(e) => setQuoteTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                {QUOTE_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setStatusFilter('');
                  setQuoteTypeFilter('');
                  setSearchTerm('');
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estimations List */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {filteredEstimations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600 mb-4">
                {estimations.length === 0 ? 'No estimations found' : 'No estimations match your filters'}
              </p>
              {estimations.length === 0 && (
                <Button onClick={() => setShowCreateModal(true)}>
                  Create your first estimation
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredEstimations.map((estimation) => (
            <Card 
              key={estimation.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/estimation/${estimation.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {estimation.project_name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[estimation.status]}`}>
                        {estimation.status.replace('_', ' ')}
                      </span>
                      {estimation.flat_rate_mode && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                          Flat Rate
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-medium text-gray-900">{estimation.project_number}</p>
                        <p>{QUOTE_TYPES.find(t => t.value === estimation.quote_type)?.label}</p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-900">
                          {estimation.customer_info ? 
                            `${estimation.customer_info.first_name} ${estimation.customer_info.last_name}` :
                            'No customer assigned'
                          }
                        </p>
                        <p>{estimation.lead_number || 'No lead'}</p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-900">{formatCurrency(estimation.total_project_cost)}</p>
                        <p className={`font-medium ${MARGIN_STATUS_COLORS[estimation.margin_status]}`}>
                          {parseFloat(String(estimation.calculated_margin_percentage || '0')).toFixed(1)}% margin
                        </p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-900">
                          {estimation.phase_count} phases, {estimation.line_item_count} items
                        </p>
                        <p>Updated {getDaysAgo(estimation.updated_at)}</p>
                      </div>
                    </div>
                    
                    {estimation.template_applied && (
                      <div className="mt-3 flex items-center text-sm text-blue-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Template: {estimation.template_applied}
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex-shrink-0">
                    <div className={`w-3 h-3 rounded-full ${
                      estimation.margin_status === 'good' ? 'bg-green-400' :
                      estimation.margin_status === 'acceptable' ? 'bg-yellow-400' :
                      estimation.margin_status === 'low' ? 'bg-orange-400' : 'bg-red-400'
                    }`}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Estimation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Start Custom Solution Assessment</h2>
                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCreateData({
                        project_name: 'Smith Heat Pump Installation',
                        customer_info: {
                          first_name: 'John',
                          last_name: 'Smith',
                          email: 'john.smith@example.com',
                          phone: '(555) 123-4567',
                          address: '123 Main St, Austin, TX 78701',
                        },
                        start_with_testing: true,
                        property_type: 'single_family',
                        approximate_sqft: 2000,
                        notes: 'Customer interested in energy-efficient heat pump system. Current system is 15+ years old.',
                      });
                    }}
                    className="text-xs"
                  >
                    Quick Fill
                  </Button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateEstimation} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                    {error}
                  </div>
                )}

                <Input
                  label="Project Name"
                  value={createData.project_name}
                  onChange={(e) => setCreateData({ ...createData, project_name: e.target.value })}
                  placeholder="e.g., Smith Custom Heat Pump Solution"
                  required
                />

                {/* Customer Information */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Customer First Name"
                    value={createData.customer_info.first_name}
                    onChange={(e) => setCreateData({ 
                      ...createData, 
                      customer_info: { ...createData.customer_info, first_name: e.target.value }
                    })}
                    placeholder="John"
                    required
                  />
                  <Input
                    label="Customer Last Name"
                    value={createData.customer_info.last_name}
                    onChange={(e) => setCreateData({ 
                      ...createData, 
                      customer_info: { ...createData.customer_info, last_name: e.target.value }
                    })}
                    placeholder="Smith"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Email (Optional)"
                    type="email"
                    value={createData.customer_info.email || ''}
                    onChange={(e) => setCreateData({ 
                      ...createData, 
                      customer_info: { ...createData.customer_info, email: e.target.value }
                    })}
                    placeholder="john.smith@example.com"
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={createData.customer_info.phone || ''}
                    onChange={(e) => setCreateData({ 
                      ...createData, 
                      customer_info: { ...createData.customer_info, phone: e.target.value }
                    })}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>

                <Input
                  label="Property Address"
                  value={createData.customer_info.address || ''}
                  onChange={(e) => setCreateData({ 
                    ...createData, 
                    customer_info: { ...createData.customer_info, address: e.target.value }
                  })}
                  placeholder="123 Main St, Austin, TX 78701"
                  required
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                    <select
                      value={createData.property_type}
                      onChange={(e) => setCreateData({ ...createData, property_type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {PROPERTY_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Approximate Sq Ft (Optional)"
                    type="number"
                    value={createData.approximate_sqft || ''}
                    onChange={(e) => setCreateData({ ...createData, approximate_sqft: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="2000"
                    min="500"
                    max="20000"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-700">Initial Notes</label>
                    {aiAvailable && createData.notes?.trim() && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAIExtractFromNotes}
                        disabled={aiProcessing}
                        className="text-xs"
                      >
                        {aiProcessing ? (
                          <>
                            <div className="w-3 h-3 border border-blue-300 border-t-blue-600 rounded-full animate-spin mr-1"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI Extract
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <textarea
                    value={createData.notes || ''}
                    onChange={(e) => setCreateData({ ...createData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Describe the project, existing system, customer needs, building details, etc..."
                  />
                  {aiAvailable && (
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Describe the project above, then click "AI Extract" to auto-fill details
                    </p>
                  )}
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="start_with_testing"
                      checked={createData.start_with_testing}
                      onChange={(e) => setCreateData({ ...createData, start_with_testing: e.target.checked })}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <label htmlFor="start_with_testing" className="ml-3 text-sm">
                      <span className="font-medium text-green-900">Start with diagnostic testing</span>
                      <div className="text-green-700">Begin with testing phase before solution design</div>
                    </label>
                  </div>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={createLoading}
                    className="flex-1"
                  >
                    {createLoading ? 'Starting...' : 'Start Custom Solution'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
          </div>
        </div>
      </main>
    </div>
  );
}