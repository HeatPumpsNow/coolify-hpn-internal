'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface LineItem {
  line_item_id: string;
  item_code: string;
  description: string;
  quantity: number | string;
  cost: number | string;
  selling_price: number | string;
  margin_percentage: number;
  status?: 'pending' | 'in_progress' | 'completed';
}

interface ProjectDetail {
  project: {
    id: string;
    project_number: string;
    project_name: string;
    quote_id?: string;
    customer_id?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    customer_address?: string;
    estimated_cost: number | string;
    quoted_price: number | string;
    actual_cost: number | string;
    actual_revenue: number | string;
    target_margin: number | string;
    status: string;
    planned_start_date?: string;
    actual_start_date?: string;
    planned_end_date?: string;
    actual_end_date?: string;
    created_at: string;
    updated_at: string;
    created_from_quote: boolean;
  };
  line_items?: LineItem[];
  phases?: any[];
  analytics?: any;
  team?: any[];
}

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-800',
  scheduled: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-green-100 text-green-800',
  on_hold: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  planning: 'Planning',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'team' | 'timeline'>('overview');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchProjectDetails();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`/api/projects/${projectId}?include=phases,analytics,time_entries&detail_level=full`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch project details');
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setProject(data.data);
        
        // Set line items if they're included in the response
        if (data.data.line_items) {
          setLineItems(data.data.line_items);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project details');
    } finally {
      setLoading(false);
    }
  };


  const updateProjectStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updates: {
            status: newStatus
          },
          update_reason: `Status changed to ${statusLabels[newStatus]}`
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update project status');
      }

      await fetchProjectDetails();
      setShowStatusModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateTotals = () => {
    if (!lineItems.length) return { totalCost: 0, totalRevenue: 0, margin: 0 };
    
    const totalCost = lineItems.reduce((sum, item) => {
      const cost = typeof item.cost === 'string' ? parseFloat(item.cost) : item.cost;
      const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
      return sum + (cost * qty);
    }, 0);
    
    const totalRevenue = lineItems.reduce((sum, item) => {
      const price = typeof item.selling_price === 'string' ? parseFloat(item.selling_price) : item.selling_price;
      const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
      return sum + (price * qty);
    }, 0);
    
    const margin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
    
    return { totalCost, totalRevenue, margin };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            {error || 'Project not found'}
          </div>
          <button
            onClick={() => router.push('/projects')}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const { totalCost, totalRevenue, margin } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/projects')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            ← Back to Projects
          </button>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{project.project.project_name}</h1>
                <p className="text-gray-600 mt-1">Project #{project.project.project_number}</p>
                {project.project.created_from_quote && (
                  <p className="text-sm text-blue-600 mt-1">Created from Quote #{project.project.quote_id}</p>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[project.project.status]}`}>
                  {statusLabels[project.project.status]}
                </span>
                <button
                  onClick={() => {
                    setNewStatus(project.project.status);
                    setShowStatusModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Update Status
                </button>
              </div>
            </div>

            {/* Customer Info */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{project.project.customer_name || 'Unknown'}</p>
                {project.project.customer_email && (
                  <p className="text-sm text-gray-600">{project.project.customer_email}</p>
                )}
                {project.project.customer_phone && (
                  <p className="text-sm text-gray-600">{project.project.customer_phone}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Timeline</p>
                <p className="font-medium">Start: {formatDate(project.project.planned_start_date)}</p>
                <p className="text-sm text-gray-600">End: {formatDate(project.project.planned_end_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Financial</p>
                <p className="font-medium">Quoted: {formatCurrency(project.project.quoted_price)}</p>
                <p className="text-sm text-gray-600">Margin: {project.project.target_margin}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'tasks'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tasks / Line Items ({lineItems.length})
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'team'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Team
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-3 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'timeline'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Timeline
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue || project.project.quoted_price)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Total Cost</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost || project.project.estimated_cost)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">Margin</p>
                    <p className="text-2xl font-bold text-gray-900">{margin.toFixed(1)}%</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Project Summary</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Created</p>
                        <p className="font-medium">{formatDate(project.project.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Last Updated</p>
                        <p className="font-medium">{formatDate(project.project.updated_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Actual Cost to Date</p>
                        <p className="font-medium">{formatCurrency(project.project.actual_cost)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Actual Revenue to Date</p>
                        <p className="font-medium">{formatCurrency(project.project.actual_revenue)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div>
                <div className="mb-4 flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Line Items / Tasks</h3>
                  <div className="text-sm text-gray-600">
                    Total Items: {lineItems.length} | Total Value: {formatCurrency(totalRevenue)}
                  </div>
                </div>
                
                {lineItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Margin</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {lineItems.map((item) => {
                          const qty = typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity;
                          const price = typeof item.selling_price === 'string' ? parseFloat(item.selling_price) : item.selling_price;
                          const cost = typeof item.cost === 'string' ? parseFloat(item.cost) : item.cost;
                          const total = price * qty;
                          
                          return (
                            <tr key={item.line_item_id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.item_code}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                              <td className="px-4 py-3 text-sm text-center text-gray-900">{qty}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(cost)}</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900">{formatCurrency(price)}</td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{formatCurrency(total)}</td>
                              <td className="px-4 py-3 text-sm text-center text-gray-900">{item.margin_percentage.toFixed(1)}%</td>
                              <td className="px-4 py-3 text-sm text-center">
                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                  {item.status || 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-sm font-medium text-right text-gray-900">Totals:</td>
                          <td className="px-4 py-3 text-sm font-bold text-right text-gray-900">{formatCurrency(totalRevenue)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-center text-gray-900">{margin.toFixed(1)}%</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No line items available for this project
                  </div>
                )}
              </div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Team Members</h3>
                {project.team && project.team.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.team.map((member: any) => (
                      <div key={member.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900">{member.name}</p>
                            <p className="text-sm text-gray-600">{member.role}</p>
                            <p className="text-sm text-gray-500">{member.email}</p>
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {member.project_role}
                          </span>
                        </div>
                        {member.hours_logged > 0 && (
                          <p className="text-sm text-gray-600 mt-2">
                            Hours logged: {member.hours_logged}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No team members assigned yet</p>
                )}
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Project Timeline</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Planned Start</p>
                        <p className="font-medium">{formatDate(project.project.planned_start_date)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Actual Start</p>
                        <p className="font-medium">{formatDate(project.project.actual_start_date)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Planned End</p>
                        <p className="font-medium">{formatDate(project.project.planned_end_date)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Actual End</p>
                        <p className="font-medium">{formatDate(project.project.actual_end_date)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {project.phases && project.phases.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Project Phases</h4>
                      <div className="space-y-2">
                        {project.phases.map((phase: any) => (
                          <div key={phase.id} className="bg-white border border-gray-200 rounded-lg p-3">
                            <p className="font-medium">{phase.phase_name}</p>
                            <p className="text-sm text-gray-600">{phase.phase_description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Update Project Status</h3>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={updateProjectStatus}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}