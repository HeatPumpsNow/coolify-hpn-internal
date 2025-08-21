'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Quote {
  id: string;
  quote_number: string;
  quote_name: string;
  status: string;
  total_amount: number;
  discount_percentage: number;
  labor_cost: number;
  equipment_cost: number;
  margin_amount: number;
  created_at: string;
  updated_at: string;
  valid_until: string;
  customer_info: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  lead_number: string;
  rep_first_name: string;
  rep_last_name: string;
}

interface QuotesResponse {
  success: boolean;
  data: {
    quotes: Quote[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const router = useRouter();

  const fetchQuotes = async (page = 1, search = '', status = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
      });

      if (search) params.set('search', search);
      if (status) params.set('status', status);

      const response = await fetch(`/api/quotes?${params}`, {
        credentials: 'include', // Include cookies
      });

      const data: QuotesResponse = await response.json();

      if (data.success) {
        setQuotes(data.data.quotes);
        setPagination(data.data.pagination);
      } else {
        setError(data.error?.message || 'Failed to fetch quotes');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuotes(1, searchTerm, statusFilter);
  };

  const handlePageChange = (newPage: number) => {
    fetchQuotes(newPage, searchTerm, statusFilter);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
          <p className="text-gray-600">Manage your sales quotes and proposals</p>
        </div>
        <Link href="/quotes/create">
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Quote
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                label="Search quotes, customers, or quote numbers"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter search term..."
              />
            </div>
            <div className="w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Quotes ({pagination.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading quotes...</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 mb-4">No quotes found</p>
              <Link href="/quotes/create">
                <Button>Create Your First Quote</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/quotes/${quote.id}`)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="font-semibold text-lg text-gray-900">
                        {quote.quote_number}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                        {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(quote.total_amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Created {formatDate(quote.created_at)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 font-medium">Customer</div>
                      <div className="text-gray-900">
                        {quote.customer_info.first_name} {quote.customer_info.last_name}
                      </div>
                      <div className="text-gray-500">Lead #{quote.lead_number}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 font-medium">Quote Details</div>
                      <div className="text-gray-900">{quote.quote_name}</div>
                      <div className="text-gray-500">
                        Valid until {formatDate(quote.valid_until)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 font-medium">Sales Rep</div>
                      <div className="text-gray-900">
                        {quote.rep_first_name} {quote.rep_last_name}
                      </div>
                      <div className="text-gray-500">
                        Equipment: {formatCurrency(quote.equipment_cost)} | 
                        Labor: {formatCurrency(quote.labor_cost)}
                      </div>
                    </div>
                  </div>

                  {quote.discount_percentage > 0 && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded-md">
                      <div className="text-sm text-yellow-800">
                        💰 {quote.discount_percentage}% discount applied
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing page {pagination.page} of {pagination.totalPages} 
                    ({pagination.total} total quotes)
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPreviousPage}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}