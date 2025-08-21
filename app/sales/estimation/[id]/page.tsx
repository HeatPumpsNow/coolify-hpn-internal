'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import SalesPortalHeader from '@/components/SalesPortalHeader';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function EstimationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lineItems, setLineItems] = useState<any>(null);
  const [loadingLineItems, setLoadingLineItems] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<any>({});

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push('/login');
      return;
    }

    if (params.id) {
      fetchEstimateDetails(params.id as string);
      fetchLineItems(params.id as string);
    }
  }, [params.id, router]);

  const fetchEstimateDetails = async (id: string) => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch estimate from API
      const response = await fetch(`/api/estimates/${id}`);
      const result = await response.json();
      
      if (!result.success) {
        setError(result.error?.message || 'Estimate not found');
        setEstimate(null);
      } else {
        setEstimate(result.data);
      }
    } catch (err) {
      setError('Failed to load estimate details');
      console.error('Estimate detail fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLineItems = async (id: string) => {
    try {
      setLoadingLineItems(true);
      
      const response = await fetch(`/api/estimates/${id}/line-items`);
      const result = await response.json();
      
      if (result.success) {
        setLineItems(result.data);
      }
    } catch (err) {
      console.error('Line items fetch error:', err);
    } finally {
      setLoadingLineItems(false);
    }
  };

  const toggleGroup = (groupCode: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupCode)) {
      newExpanded.delete(groupCode);
    } else {
      newExpanded.add(groupCode);
    }
    setExpandedGroups(newExpanded);
  };

  const handleFieldChange = (itemId: string, field: string, value: any) => {
    setEditValues({
      ...editValues,
      [`${itemId}_${field}`]: value
    });
  };

  const saveFieldValue = async (itemId: string, field: string) => {
    const key = `${itemId}_${field}`;
    const value = editValues[key];
    
    // If no change, don't save
    const item = lineItems?.groups?.flatMap((g: any) => g.items).find((i: any) => i.id === itemId);
    if (!item || value === undefined || value === item[field]) {
      return;
    }

    // Validate numeric fields
    if (['quantity', 'hours', 'labor_rate', 'material_cost'].includes(field)) {
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) {
        alert(`${field.replace('_', ' ')} must be a valid positive number`);
        delete editValues[key];
        setEditValues({ ...editValues });
        return;
      }
    }

    try {
      const updates: any = { [field]: parseFloat(value) || 0 };
      
      // If hours or labor_rate changed, recalculate total_labor_cost
      if (field === 'hours' || field === 'labor_rate') {
        const hours = field === 'hours' ? parseFloat(value) : item.hours;
        const rate = field === 'labor_rate' ? parseFloat(value) : item.labor_rate;
        updates.total_labor_cost = hours * rate;
      }
      
      // If material_cost changed, update total_material_cost
      if (field === 'material_cost') {
        updates.total_material_cost = parseFloat(value);
      }

      const response = await fetch(`/api/estimates/${estimate.id}/line-items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line_item_id: itemId,
          updates: updates
        }),
      });

      if (response.ok) {
        // Refresh line items
        fetchLineItems(estimate.id);
        delete editValues[key];
        setEditValues({ ...editValues });
      } else {
        alert(`Failed to update ${field.replace('_', ' ')}`);
      }
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      alert(`Failed to update ${field.replace('_', ' ')}`);
    }
  };

  const getFieldValue = (itemId: string, field: string, defaultValue: any) => {
    const key = `${itemId}_${field}`;
    return editValues.hasOwnProperty(key) ? editValues[key] : defaultValue;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
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
              <p className="text-gray-600 mt-2">Loading estimate details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!estimate) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SalesPortalHeader user={user} />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Estimate not found</p>
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
      <main className="max-w-full mx-auto py-6">
        <div className="px-6">
          {/* Streamlined Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.push(`/opportunities/${estimate.opportunity_id}`)}>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {estimate.project_name || `Estimate #${estimate.estimate_number}`}
                </h1>
                <p className="text-sm text-gray-500">Building accurate cost estimate</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {(estimate.status === 'completed' || estimate.status === 'sent') ? (
                <Button 
                  size="sm"
                  onClick={() => router.push(`/quotes/create?estimate_id=${estimate.id}&opportunity_id=${estimate.opportunity_id}`)}
                >
                  Convert to Quote
                </Button>
              ) : (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(estimate.status)}`}>
                  {estimate.status.replace(/_/g, ' ').toUpperCase()}
                </span>
              )}
              <Button variant="outline" size="sm">
                Export PDF
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Line Items - Main Content (3/4 width) */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Cost Breakdown</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Click categories to expand • Edit values directly</p>
                    </div>
                    {lineItems && lineItems.groups && lineItems.groups.length === 0 && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const response = await fetch('/api/line-items', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                              estimate_id: estimate.id,
                              add_defaults: true 
                            })
                          });
                          if (response.ok) {
                            fetchLineItems(estimate.id);
                          }
                        }}
                      >
                        Add Default Line Items
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">{loadingLineItems ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  </div>
                ) : lineItems && lineItems.groups && lineItems.groups.length > 0 ? (
                  <div>
                    {/* Display collapsible cost groups */}
                    {lineItems.groups.map((group: any, index: number) => {
                      const isExpanded = expandedGroups.has(group.code);
                      const totalHours = group.items.reduce((sum: number, item: any) => 
                        sum + parseFloat(item.hours || 0), 0
                      );
                      
                      return (
                        <div key={group.code} className={`${index > 0 ? 'border-t' : ''}`}>
                          {/* Cost Group Header - Clickable */}
                          <div 
                            className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => toggleGroup(group.code)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <svg 
                                  className={`w-4 h-4 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {group.code} - {group.name}
                                  </h4>
                                  <p className="text-xs text-gray-500">
                                    {group.items.length} items • {totalHours.toFixed(1)} hrs
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {formatCurrency(group.total_cost)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  L: {formatCurrency(group.total_labor)} | M: {formatCurrency(group.total_material)}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Expandable Line Items */}
                          {isExpanded && (
                            <div className="bg-gray-50 border-t">
                              <table className="min-w-full">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                      Item
                                    </th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">
                                      Qty
                                    </th>
                                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">
                                      Hrs
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                                      Rate
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                                      Material
                                    </th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                                      Total
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                  {group.items.map((item: any) => (
                                    <tr key={item.id}>
                                      <td className="px-4 py-2">
                                        <p className="text-xs font-medium text-gray-900">{item.item_code}</p>
                                        <p className="text-xs text-gray-600">{item.line_item_name}</p>
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="number"
                                          value={getFieldValue(item.id, 'quantity', item.quantity)}
                                          onChange={(e) => handleFieldChange(item.id, 'quantity', e.target.value)}
                                          onBlur={() => saveFieldValue(item.id, 'quantity')}
                                          onKeyPress={(e) => e.key === 'Enter' && saveFieldValue(item.id, 'quantity')}
                                          className="w-14 px-1 py-0.5 border border-gray-200 rounded text-xs text-center focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                          min="0"
                                          step="0.1"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="number"
                                          value={getFieldValue(item.id, 'hours', item.hours || 0)}
                                          onChange={(e) => handleFieldChange(item.id, 'hours', e.target.value)}
                                          onBlur={() => saveFieldValue(item.id, 'hours')}
                                          onKeyPress={(e) => e.key === 'Enter' && saveFieldValue(item.id, 'hours')}
                                          className="w-14 px-1 py-0.5 border border-gray-200 rounded text-xs text-center focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                          min="0"
                                          step="0.5"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="flex items-center justify-end">
                                          <span className="text-xs text-gray-400 mr-1">$</span>
                                          <input
                                            type="number"
                                            value={getFieldValue(item.id, 'labor_rate', item.labor_rate || 0)}
                                            onChange={(e) => handleFieldChange(item.id, 'labor_rate', e.target.value)}
                                            onBlur={() => saveFieldValue(item.id, 'labor_rate')}
                                            onKeyPress={(e) => e.key === 'Enter' && saveFieldValue(item.id, 'labor_rate')}
                                            className="w-16 px-1 py-0.5 border border-gray-200 rounded text-xs text-right focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                            min="0"
                                            step="5"
                                          />
                                        </div>
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="flex items-center justify-end">
                                          <span className="text-xs text-gray-400 mr-1">$</span>
                                          <input
                                            type="number"
                                            value={getFieldValue(item.id, 'material_cost', item.material_cost || 0)}
                                            onChange={(e) => handleFieldChange(item.id, 'material_cost', e.target.value)}
                                            onBlur={() => saveFieldValue(item.id, 'material_cost')}
                                            onKeyPress={(e) => e.key === 'Enter' && saveFieldValue(item.id, 'material_cost')}
                                            className="w-20 px-1 py-0.5 border border-gray-200 rounded text-xs text-right focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                            min="0"
                                            step="10"
                                          />
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <span className="text-xs font-medium text-gray-900">
                                          {formatCurrency(item.total_cost || 0)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Fallback if no line items
                  <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No line items found</p>
                    <Button 
                      onClick={async () => {
                        const response = await fetch('/api/line-items', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            estimate_id: estimate.id,
                            add_defaults: true 
                          })
                        });
                        if (response.ok) {
                          fetchLineItems(estimate.id);
                          alert('Default line items added successfully!');
                        }
                      }}
                    >
                      Add Default Line Items
                    </Button>
                  </div>
                )}
                </CardContent>
              </Card>
            </div>

            {/* Cost Summary Sidebar (1/4 width) */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cost Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Equipment</span>
                        <span className="font-medium">{formatCurrency(estimate.total_equipment_cost || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Labor</span>
                        <span className="font-medium">{formatCurrency(lineItems?.totals?.total_labor || estimate.total_labor_cost || 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Materials</span>
                        <span className="font-medium">{formatCurrency(lineItems?.totals?.total_material || estimate.total_material_cost || 0)}</span>
                      </div>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="flex justify-between">
                        <span className="font-medium">Total Cost</span>
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency(lineItems?.totals?.total_cost || estimate.total_cost || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Labor Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {lineItems?.groups?.map((group: any) => {
                      const totalHours = group.items.reduce((sum: number, item: any) => 
                        sum + parseFloat(item.hours || 0), 0
                      );
                      if (totalHours === 0) return null;
                      return (
                        <div key={group.code} className="flex justify-between text-sm">
                          <span className="text-gray-600">{group.code}</span>
                          <span className="font-medium">{totalHours.toFixed(1)} hrs</span>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Total Hours</span>
                        <span className="font-bold">
                          {lineItems?.groups?.reduce((total: number, group: any) => 
                            total + group.items.reduce((sum: number, item: any) => 
                              sum + parseFloat(item.hours || 0), 0
                            ), 0
                          ).toFixed(1) || '0.0'} hrs
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        const allGroups = new Set(lineItems?.groups?.map((g: any) => g.code) || []);
                        setExpandedGroups(allGroups);
                      }}
                    >
                      Expand All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => setExpandedGroups(new Set())}
                    >
                      Collapse All
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}