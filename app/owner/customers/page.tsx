'use client';

import { useState, useEffect } from 'react';
import { 
  UserCheck,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Settings,
  Eye,
  Edit,
  MoreVertical,
  Filter
} from 'lucide-react';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  address: string;
  city?: string;
  state?: string;
  zipCode?: string;
  createdAt: string;
  lastServiceDate?: string;
  totalJobs: number;
  totalSpent: number;
  serviceRequests: number;
  status: 'active' | 'inactive';
  notes?: string;
}

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newThisMonth: number;
  averageJobValue: number;
  repeatCustomers: number;
  satisfactionScore: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter, sortBy, sortOrder, searchTerm]);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        search: searchTerm,
        sortBy,
        sortOrder
      });

      const response = await fetch(`/api/owner/customers?${params}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        
        // Transform the API response to match the frontend interface
        const transformedCustomers = (data.customers || []).map((customer: any) => ({
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone,
          address: customer.address?.full || customer.address?.street || '',
          city: customer.address?.city,
          state: customer.address?.state,
          zipCode: customer.address?.zip,
          createdAt: customer.customerSince,
          lastServiceDate: customer.lastJobDate,
          totalJobs: customer.totalJobs,
          totalSpent: customer.totalSpent,
          serviceRequests: 0, // This would need to be added to the API
          status: customer.status || 'active',
          notes: customer.notes
        }));
        
        // Transform summary to match expected stats interface
        const transformedStats = data.summary ? {
          totalCustomers: data.summary.totalCustomers,
          activeCustomers: data.summary.activeCustomers,
          newThisMonth: 0, // This would need to be calculated
          averageJobValue: data.summary.averageCustomerValue,
          repeatCustomers: 0, // This would need to be calculated
          satisfactionScore: 4.2 // Default value
        } : null;
        
        setCustomers(transformedCustomers);
        setStats(transformedStats);
      } else {
        console.error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <UserCheck className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
              <p className="text-gray-600">Manage customer information and service history</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <StatCard
              title="Total Customers"
              value={stats.totalCustomers.toString()}
              icon={UserCheck}
              color="text-blue-600"
              bgColor="bg-blue-100"
            />
            <StatCard
              title="Active Customers"
              value={stats.activeCustomers.toString()}
              icon={UserCheck}
              color="text-green-600"
              bgColor="bg-green-100"
            />
            <StatCard
              title="New This Month"
              value={stats.newThisMonth.toString()}
              icon={Plus}
              color="text-purple-600"
              bgColor="bg-purple-100"
            />
            <StatCard
              title="Avg Job Value"
              value={`$${stats.averageJobValue.toLocaleString()}`}
              icon={FileText}
              color="text-yellow-600"
              bgColor="bg-yellow-100"
            />
            <StatCard
              title="Repeat Customers"
              value={stats.repeatCustomers.toString()}
              icon={Calendar}
              color="text-orange-600"
              bgColor="bg-orange-100"
            />
            <StatCard
              title="Satisfaction"
              value={`${stats.satisfactionScore.toFixed(1)}/5`}
              icon={Settings}
              color="text-red-600"
              bgColor="bg-red-100"
            />
          </div>
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="created-desc">Newest First</option>
            <option value="created-asc">Oldest First</option>
            <option value="spent-desc">Highest Spent</option>
            <option value="spent-asc">Lowest Spent</option>
            <option value="jobs-desc">Most Jobs</option>
            <option value="jobs-asc">Fewest Jobs</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Customers ({customers.length})
          </h3>
        </div>
        
        {customers.length === 0 ? (
          <div className="text-center py-12">
            <UserCheck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first customer'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {customers.map((customer) => (
              <div 
                key={customer.id} 
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => {
                  // Open customer detail popup in new tab
                  window.open(`/owner/customers/${customer.id}`, '_blank');
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {/* Customer Avatar and Name */}
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {customer.firstName[0]}{customer.lastName[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {customer.fullName}
                        </p>
                        <p className="text-xs text-gray-500">
                          Since {new Date(customer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div className="hidden sm:flex items-center space-x-4 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-32">{customer.email}</span>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    <div className="hidden md:flex items-center space-x-1 text-xs text-gray-600 max-w-48">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">
                        {customer.address}
                        {customer.city && `, ${customer.city}`}
                      </span>
                    </div>

                    {/* Service Info */}
                    <div className="hidden lg:flex items-center space-x-4 text-xs">
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">{customer.totalJobs}</p>
                        <p className="text-gray-500">Jobs</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-green-600">${customer.totalSpent.toLocaleString()}</p>
                        <p className="text-gray-500">Spent</p>
                      </div>
                      {customer.lastServiceDate && (
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">
                            {new Date(customer.lastServiceDate).toLocaleDateString()}
                          </p>
                          <p className="text-gray-500">Last Service</p>
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex items-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                        {customer.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomer(customer);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Edit functionality
                      }}
                      className="text-gray-600 hover:text-gray-900"
                      title="Edit Customer"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile-only expanded info */}
                <div className="mt-3 sm:hidden">
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Mail className="h-3 w-3" />
                      <span>{customer.email}</span>
                    </div>
                    {customer.phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-3 w-3" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <span className="font-semibold">{customer.totalJobs} jobs</span>
                      <span>•</span>
                      <span className="font-semibold text-green-600">${customer.totalSpent.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  bgColor 
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}