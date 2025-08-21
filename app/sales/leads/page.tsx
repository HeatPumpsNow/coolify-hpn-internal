'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  lead_source: string;
  status: string;
  interest_level: string;
  education_progress: number;
  notes: string;
  created_at: string;
  rep_first_name: string;
  rep_last_name: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const router = useRouter();

  // New lead form state
  const [newLead, setNewLead] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    lead_source: 'manual',
    notes: '',
    interest_level: 'medium',
  });

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    fetchLeads();
  }, [router]);

  useEffect(() => {
    if (!loading) {
      fetchLeads();
    }
  }, [searchTerm, selectedStatus]);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams({
        ...(selectedStatus && { status: selectedStatus }),
        ...(searchTerm && { search: searchTerm }),
        limit: '50',
      });

      const response = await fetch(`/api/leads?${params}`, {
        credentials: 'include', // Include cookies
      });
      const data = await response.json();
      
      if (data.success) {
        setLeads(data.data.leads);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(newLead),
      });

      const data = await response.json();
      
      if (data.success) {
        setShowNewLeadForm(false);
        setNewLead({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zip_code: '',
          lead_source: 'manual',
          notes: '',
          interest_level: 'medium',
        });
        fetchLeads(); // Refresh the list
      } else {
        alert('Error creating lead: ' + data.error.message);
      }
    } catch (error) {
      console.error('Error creating lead:', error);
      alert('Error creating lead');
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800',
      contacted: 'bg-yellow-100 text-yellow-800',
      qualified: 'bg-green-100 text-green-800',
      quoted: 'bg-purple-100 text-purple-800',
      closed_won: 'bg-green-200 text-green-900',
      closed_lost: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getInterestColor = (level: string) => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-orange-500',
      high: 'text-red-500',
    };
    return colors[level as keyof typeof colors] || 'text-gray-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Heat Pumps Now</h1>
              <span className="ml-2 text-blue-600 font-medium">Sales Portal</span>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <a href="/dashboard" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </a>
              <Link href="/price-book" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Price Book
              </Link>
              <Link href="/leads" className="text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium">
                Leads
              </Link>
              <Link href="/quotes" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Quotes
              </Link>
            </nav>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page Header */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Leads</h2>
              <p className="mt-1 text-gray-600">
                Manage your sales leads and pipeline
              </p>
            </div>
            <Button onClick={() => setShowNewLeadForm(true)}>
              Add New Lead
            </Button>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search leads by name, email, phone, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input-field"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="quoted">Quoted</option>
                <option value="closed_won">Closed Won</option>
                <option value="closed_lost">Closed Lost</option>
              </select>
            </div>
          </div>

          {/* Leads List */}
          <div className="space-y-4">
            {leads.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No leads found matching your criteria.</p>
                  <Button className="mt-4" onClick={() => setShowNewLeadForm(true)}>
                    Create Your First Lead
                  </Button>
                </CardContent>
              </Card>
            ) : (
              leads.map((lead) => (
                <Card key={lead.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lead.status)}`}>
                            {lead.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`text-sm font-medium ${getInterestColor(lead.interest_level)}`}>
                            ★ {lead.interest_level.toUpperCase()} INTEREST
                          </span>
                          <span className="text-sm text-gray-500">
                            {lead.lead_source}
                          </span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {lead.first_name} {lead.last_name}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span>📧 {lead.email}</span>
                          <span>📞 {lead.phone}</span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          📍 {lead.address}, {lead.city}, {lead.state} {lead.zip_code}
                        </p>
                        
                        {lead.notes && (
                          <p className="text-sm text-gray-500 mt-2">
                            💬 {lead.notes}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span>Created: {new Date(lead.created_at).toLocaleDateString()}</span>
                          {lead.rep_first_name && (
                            <span>Rep: {lead.rep_first_name} {lead.rep_last_name}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-6 flex flex-col gap-2">
                        <Button size="sm" variant="outline">
                          Contact
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => router.push(`/quotes/create?lead_id=${lead.id}`)}
                        >
                          Create Quote
                        </Button>
                        <Button size="sm" variant="outline">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      {/* New Lead Modal */}
      {showNewLeadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add New Lead</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateLead} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={newLead.first_name}
                    onChange={(e) => setNewLead({ ...newLead, first_name: e.target.value })}
                    required
                  />
                  <Input
                    label="Last Name"
                    value={newLead.last_name}
                    onChange={(e) => setNewLead({ ...newLead, last_name: e.target.value })}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    required
                  />
                  <Input
                    label="Phone"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    required
                  />
                </div>
                
                <Input
                  label="Address"
                  value={newLead.address}
                  onChange={(e) => setNewLead({ ...newLead, address: e.target.value })}
                  required
                />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Input
                    label="City"
                    value={newLead.city}
                    onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                    required
                  />
                  <Input
                    label="State"
                    value={newLead.state}
                    onChange={(e) => setNewLead({ ...newLead, state: e.target.value })}
                    required
                  />
                  <Input
                    label="ZIP Code"
                    value={newLead.zip_code}
                    onChange={(e) => setNewLead({ ...newLead, zip_code: e.target.value })}
                    required
                  />
                  <div>
                    <label className="label">Interest Level</label>
                    <select
                      value={newLead.interest_level}
                      onChange={(e) => setNewLead({ ...newLead, interest_level: e.target.value })}
                      className="input-field"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="label">Lead Source</label>
                  <select
                    value={newLead.lead_source}
                    onChange={(e) => setNewLead({ ...newLead, lead_source: e.target.value })}
                    className="input-field"
                  >
                    <option value="manual">Manual Entry</option>
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="social_media">Social Media</option>
                    <option value="trade_show">Trade Show</option>
                    <option value="advertisement">Advertisement</option>
                  </select>
                </div>
                
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={newLead.notes}
                    onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                    className="input-field min-h-[100px]"
                    placeholder="Any additional notes about this lead..."
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1">
                    Create Lead
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewLeadForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}