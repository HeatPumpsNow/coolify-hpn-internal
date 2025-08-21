'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import SalesPortalHeader from '@/components/SalesPortalHeader';
interface Opportunity {
  id: string;
  lead_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  customer_type?: string;
  customer_notes?: string;
  status: string;
  stage: string;
  value: number;
  probability: number;
  created_at: string;
  updated_at: string;
  assigned_to: string;
  last_contact: string;
  next_follow_up: string;
  source: string;
  notes?: string;
  estimates?: any[];
  tags?: string[];
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function OpportunityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'estimate' | 'quote' | 'activities'>('overview');
  const [quote, setQuote] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push('/login');
      return;
    }

    if (params.id) {
      fetchOpportunityDetails(params.id as string);
    }
  }, [params.id, router]);

  const fetchOpportunityDetails = async (id: string) => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch opportunity from API
      const response = await fetch(`/api/opportunities/${id}`);
      const result = await response.json();
      
      if (!result.success) {
        setError(result.error?.message || 'Opportunity not found');
        setOpportunity(null);
      } else {
        setOpportunity(result.data);
        // Check if there's a quote for this opportunity
        if (result.data.quote_id) {
          fetchQuoteDetails(result.data.quote_id);
        }
      }
    } catch (err) {
      setError('Failed to load opportunity details');
      console.error('Opportunity detail fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuoteDetails = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      const result = await response.json();
      
      if (result.success) {
        setQuote(result.data.quote || result.data);
      }
    } catch (err) {
      console.error('Quote fetch error:', err);
    }
  };

  const handleStageUpdate = async (newStage: string) => {
    if (!opportunity) return;
    
    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage: newStage }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setOpportunity({
          ...opportunity,
          stage: newStage,
          updated_at: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Failed to update stage:', err);
    }
  };

  const handleMarkAsLost = async () => {
    if (!opportunity) return;
    const reason = prompt('Please provide a reason for marking this opportunity as lost:');
    if (!reason) return;
    
    try {
      const response = await fetch(`/api/opportunities/${opportunity.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'closed_lost',
          notes: `Lost reason: ${reason}`
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setOpportunity({
          ...opportunity,
          status: 'closed_lost',
          notes: `Lost reason: ${reason}`,
          updated_at: new Date().toISOString()
        });
        alert('Opportunity marked as lost and retained in customer database');
      }
    } catch (err) {
      console.error('Failed to mark as lost:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPipelineStageColor = (stage: string) => {
    switch (stage) {
      case 'discovery': return 'bg-gray-100 text-gray-800';
      case 'qualification': return 'bg-yellow-100 text-yellow-800';
      case 'proposal': return 'bg-blue-100 text-blue-800';
      case 'negotiation': return 'bg-purple-100 text-purple-800';
      case 'closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {user && <SalesPortalHeader user={user} />}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading opportunity details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SalesPortalHeader user={user} />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Opportunity not found</p>
              <Button onClick={() => router.push('/opportunities')}>Back to Opportunities</Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SalesPortalHeader user={user} />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <Button variant="outline" onClick={() => router.push('/opportunities')}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">
                  {opportunity.customer_name}
                </h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPipelineStageColor(opportunity.stage)}`}>
                  {opportunity.stage.replace(/_/g, ' ').toUpperCase()}
                </span>
                {opportunity.status === 'closed_lost' && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    LOST
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">{opportunity.lead_number} • {formatCurrency(opportunity.value)}</p>
            </div>
            
            <div className="flex space-x-3">
              {opportunity.status !== 'closed_lost' && (
                <>
                  <Button variant="outline" onClick={handleMarkAsLost}>
                    Mark as Lost
                  </Button>
                  <Button variant="outline">
                    Edit Details
                  </Button>
                </>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Pipeline Stage Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between space-x-2">
                {['discovery', 'qualification', 'proposal', 'negotiation', 'closed'].map((stage, index) => {
                  const stages = ['discovery', 'qualification', 'proposal', 'negotiation', 'closed'];
                  const currentIndex = stages.indexOf(opportunity.stage);
                  const stageIndex = stages.indexOf(stage);
                  const isCompleted = stageIndex <= currentIndex;
                  const isCurrent = stage === opportunity.stage;

                  return (
                    <div key={stage} className="flex-1">
                      <div className="relative">
                        {index < stages.length - 1 && (
                          <div className={`absolute top-5 left-1/2 w-full h-0.5 ${isCompleted ? 'bg-blue-600' : 'bg-gray-300'}`} />
                        )}
                        <button
                          onClick={() => handleStageUpdate(stage)}
                          className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                            isCompleted ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                          } ${isCurrent ? 'ring-4 ring-blue-200' : ''} hover:ring-4 hover:ring-blue-100`}
                        >
                          {isCompleted ? '✓' : index + 1}
                        </button>
                      </div>
                      <p className="text-xs text-center mt-2 text-gray-600">
                        {stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'estimate', label: 'Estimates', badge: opportunity.estimates?.length ? `${opportunity.estimates.length}` : undefined },
                { key: 'quote', label: 'Quote/Proposal' },
                { key: 'activities', label: 'Activities' }
              ].map(({ key, label, badge }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{label}</span>
                  {badge && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {badge.replace(/_/g, ' ')}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Name</label>
                    <p className="text-gray-900">{opportunity.customer_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email</label>
                    <p className="text-gray-900">{opportunity.customer_email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone</label>
                    <p className="text-gray-900">{opportunity.customer_phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address</label>
                    <p className="text-gray-900">{opportunity.customer_address || 'Not provided'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Opportunity Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Estimated Value</label>
                    <p className="text-gray-900 text-lg font-semibold">{formatCurrency(opportunity.value)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Probability</label>
                    <p className="text-gray-900">{opportunity.probability}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Assigned To</label>
                    <p className="text-gray-900">{opportunity.assigned_to}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Next Follow-up</label>
                    <p className="text-gray-900">{opportunity.next_follow_up && formatDate(opportunity.next_follow_up)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Source</label>
                    <p className="text-gray-900">{opportunity.source}</p>
                  </div>
                  {opportunity.status === 'closed_lost' && opportunity.notes && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Notes</label>
                      <p className="text-gray-900">{opportunity.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'estimate' && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Estimate Details</CardTitle>
                  <div className="flex space-x-2">
                    {!opportunity.estimates || opportunity.estimates.length === 0 ? (
                      <Button onClick={() => router.push(`/estimation/create?opportunity_id=${opportunity.id}`)}>
                        Create Estimate
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => router.push(`/estimation/${opportunity.estimates[0].id}`)}>
                          View Estimate ({opportunity.estimates.length})
                        </Button>
                        <Button onClick={() => router.push(`/estimation/create?opportunity_id=${opportunity.id}`)}>
                          Create New Estimate
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {opportunity.estimates && opportunity.estimates.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Estimate Number</span>
                        <span className="text-gray-900">{opportunity.estimates[0].estimate_number}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Status</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          (opportunity.estimates[0].status === 'completed' || opportunity.estimates[0].status === 'sent') ? 'bg-green-100 text-green-800' :
                          opportunity.estimates[0].status === 'in_review' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {opportunity.estimates[0].status === 'sent' ? 'COMPLETED' : opportunity.estimates[0].status?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Total Cost</span>
                        <span className="text-gray-900">{formatCurrency(opportunity.estimates[0].total_cost)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Margin</span>
                        <span className="text-gray-900">{opportunity.estimates[0].margin_percentage}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Final Price</span>
                        <span className="text-gray-900 font-semibold text-lg">{formatCurrency(opportunity.estimates[0].final_price)}</span>
                      </div>
                      {(opportunity.estimates[0].status === 'completed' || opportunity.estimates[0].status === 'sent') && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-800">
                            Estimate completed. You can now convert it to a quote for the customer.
                          </p>
                          <div className="flex space-x-2 mt-2">
                            <Button size="sm" onClick={() => router.push(`/estimation/${opportunity.estimates[0].id}`)}>
                              View Full Estimate →
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => router.push(`/quotes/create?estimate_id=${opportunity.estimates[0].id}&opportunity_id=${opportunity.id}`)}>
                              Create Quote →
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-8">
                      No estimate has been created for this opportunity yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'quote' && (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Quote/Proposal Details</CardTitle>
                  <div className="flex space-x-2">
                    {!quote ? (
                      <Button 
                        onClick={() => {
                          const latestEstimate = opportunity.estimates?.find((est: any) => 
                            est.status === 'completed' || est.status === 'sent'
                          );
                          if (latestEstimate) {
                            router.push(`/quotes/create?estimate_id=${latestEstimate.id}&opportunity_id=${opportunity.id}`);
                          } else {
                            router.push(`/quotes/create?opportunity_id=${opportunity.id}`);
                          }
                        }}
                        disabled={!opportunity.estimates || opportunity.estimates.length === 0}
                      >
                        Create Quote
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => router.push(`/quotes/${quote.id}`)}>
                          View Quote
                        </Button>
                        <Button variant="outline" onClick={() => router.push(`/quotes/${quote.id}/display`)}>
                          View Customer Display
                        </Button>
                        <Button variant="outline">
                          Send Quote
                        </Button>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {quote ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Quote Number</span>
                        <span className="text-gray-900">{quote.quote_number}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Quote Name</span>
                        <span className="text-gray-900">{quote.quote_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Status</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          quote.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          quote.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {quote.status?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Total Amount</span>
                        <span className="text-gray-900 font-semibold">{formatCurrency(quote.total_selling_price || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Margin</span>
                        <span className="text-gray-900">{formatCurrency(quote.total_margin || 0)} ({(quote.margin_percentage || 0).toFixed(1)}%)</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Valid Until</span>
                        <span className="text-gray-900">{quote.valid_until ? formatDate(quote.valid_until) : 'Not set'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600">Contract Status</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          opportunity.contract_status === 'signed' ? 'bg-green-100 text-green-800' :
                          opportunity.contract_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {opportunity.contract_status?.toUpperCase()}
                        </span>
                      </div>
                      {opportunity.quote_status === 'accepted' && opportunity.contract_status !== 'signed' && (
                        <div className="mt-4 p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">
                            Quote has been accepted! Generate and send contract for signature.
                          </p>
                          <Button className="mt-2" size="sm">
                            Generate Contract →
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      {(!opportunity.estimates || opportunity.estimates.length === 0 || 
                        !opportunity.estimates.some((est: any) => est.status === 'completed' || est.status === 'sent')) ? (
                        <p className="text-gray-600">
                          Complete the estimate first before creating a quote.
                        </p>
                      ) : (
                        <p className="text-gray-600">
                          No quote has been created for this opportunity yet.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'activities' && (
            <Card>
              <CardHeader>
                <CardTitle>Activities & Communication</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-l-2 border-gray-200 pl-4 space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">3 days ago</p>
                      <p className="text-gray-900">Quote sent to customer via email</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">5 days ago</p>
                      <p className="text-gray-900">Estimate completed</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">1 week ago</p>
                      <p className="text-gray-900">Site assessment conducted</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">2 weeks ago</p>
                      <p className="text-gray-900">Initial contact and needs qualification</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Button variant="outline" className="w-full">
                      Add Activity Note
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}