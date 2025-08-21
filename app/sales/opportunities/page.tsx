'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import SalesPortalHeader from '@/components/SalesPortalHeader';
interface Opportunity {
  id: string;
  lead_number: string;
  customer_name: string;
  address: string;
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
  customer_type?: string;
  customer_email?: string;
  customer_phone?: string;
  tags?: string[];
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function OpportunitiesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
  const router = useRouter();

  useEffect(() => {
    // Get user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push('/login');
      return;
    }
    
    fetchOpportunities();
  }, [filterStatus, filterStage, router]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch opportunities from API
      const response = await fetch('/api/opportunities');
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch opportunities');
      }
      
      // Apply filters on the fetched data
      let filteredOpportunities = result.data.opportunities;
      
      if (filterStatus) {
        filteredOpportunities = filteredOpportunities.filter((opp: Opportunity) => opp.status === filterStatus);
      }
      if (filterStage) {
        filteredOpportunities = filteredOpportunities.filter((opp: Opportunity) => opp.stage === filterStage);
      }

      setOpportunities(filteredOpportunities);
    } catch (err) {
      setError('Failed to load opportunities');
      console.error('Opportunities fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getQuoteStatusColor = (status?: string) => {
    switch (status) {
      case 'sent': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'accepted': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getContractStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'signed': return 'bg-green-100 text-green-800 border-green-300';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'deposit_pending': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'deposit_paid': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'progress_billing': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'paid_in_full': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
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
    });
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {user && <SalesPortalHeader user={user} />}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
              </div>
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading opportunities...</p>
              </div>
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="text-gray-600">Manage qualified leads through quote-to-cash process</p>
        </div>
        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                viewMode === 'pipeline' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pipeline View
            </button>
          </div>
          <Button onClick={() => router.push('/opportunities/create')}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Opportunity
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="working">Working</option>
              <option value="qualified">Qualified</option>
              <option value="closed_won">Closed Won</option>
              <option value="closed_lost">Closed Lost</option>
            </select>
            
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Stages</option>
              <option value="discovery">Discovery</option>
              <option value="qualification">Qualification</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="closed">Closed</option>
            </select>
            
            <Button variant="outline" onClick={() => {
              setFilterStatus('');
              setFilterStage('');
            }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities Views */}
      {viewMode === 'list' ? (
        <div className="grid gap-6">
          {opportunities.map((opportunity) => (
          <Card key={opportunity.id} className="hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => router.push(`/opportunities/${opportunity.id}`)}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {opportunity.customer_name}
                  </h3>
                  <p className="text-sm text-gray-600">{opportunity.lead_number}</p>
                  <p className="text-sm text-gray-500">
                    {opportunity.address}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{color: '#0000cd'}}>
                    {formatCurrency(opportunity.value)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {opportunity.probability}% probability
                  </div>
                </div>
              </div>

              {/* Status and Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">Status</div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                    opportunity.status === 'qualified' ? 'bg-green-100 text-green-800 border-green-300' :
                    opportunity.status === 'working' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                    opportunity.status === 'new' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                    'bg-gray-100 text-gray-800 border-gray-300'
                  }`}>
                    {opportunity.status.toUpperCase()}
                  </span>
                </div>
                
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">Source</div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-300">
                    {opportunity.source}
                  </span>
                </div>
                
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">Assigned To</div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-purple-100 text-purple-800 border-purple-300">
                    {opportunity.assigned_to}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Stage: {opportunity.stage.replace('_', ' ').toUpperCase()}</span>
                <span>Updated: {formatDate(opportunity.updated_at)}</span>
              </div>

              {opportunity.next_follow_up && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Next Follow-up</div>
                  <div className="text-xs text-blue-600">
                    {formatDate(opportunity.next_follow_up)}
                  </div>
                </div>
              )}
              
              {opportunity.tags && opportunity.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {opportunity.tags.map((tag, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          ))}
        </div>
      ) : (
        // Pipeline View
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
          {['discovery', 'qualification', 'proposal', 'negotiation', 'closed'].map((stage) => {
            const stageOpportunities = opportunities.filter(opp => opp.stage === stage);
            const stageName = stage.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            
            return (
              <div key={stage} className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{stageName}</h3>
                <div className="space-y-3">
                  {stageOpportunities.map((opportunity) => (
                    <Card key={opportunity.id} className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => router.push(`/opportunities/${opportunity.id}`)}>
                      <CardContent className="p-3">
                        <h4 className="font-medium text-sm text-gray-900 mb-1">
                          {opportunity.customer_name}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">{formatCurrency(opportunity.value)}</p>
                        <p className="text-xs text-gray-500">{opportunity.probability}% prob.</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {opportunities.length === 0 && !loading && (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-gray-600 mb-4">No opportunities found</p>
          <Button onClick={() => router.push('/opportunities/create')}>
            Create Your First Opportunity
          </Button>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}