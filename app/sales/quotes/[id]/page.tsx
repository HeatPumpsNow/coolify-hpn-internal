'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import SalesPortalHeader from '@/components/SalesPortalHeader';

interface QuoteItem {
  line_item_id?: string;
  item_code: string;
  description: string;
  quantity: number;
  cost: number;
  selling_price: number;
  margin_percentage?: number;
  custom_markup?: any;
}

interface Quote {
  id: string;
  quote_number: string;
  quote_name: string;
  status: string;
  total_cost: number;
  total_selling_price: number;
  total_margin: number;
  margin_percentage: number;
  global_markup: any;
  group_markups: any[];
  line_items: QuoteItem[];
  terms_template_id: string;
  terms_content: string;
  notes: any[];
  created_at: string;
  updated_at: string;
  valid_until: string;
  opportunity_id: string;
  estimate_id: string;
  customer_info: {
    name: string;
    email?: string;
    phone?: string;
  };
  lead_number: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function QuoteDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push('/login');
      return;
    }

    if (quoteId) {
      fetchQuoteDetails();
    }
  }, [quoteId, router]);

  const fetchQuoteDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quotes/${quoteId}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setQuote(data.data.quote);
      } else {
        setError(data.error?.message || 'Failed to fetch quote details');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching quote:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateQuoteStatus = async (newStatus: string) => {
    if (!quote) return;

    try {
      setUpdating(true);
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setQuote(prev => prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null);
      } else {
        setError(data.error?.message || 'Failed to update quote status');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error updating quote:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'sent':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isQuoteExpired = () => {
    if (!quote) return false;
    return new Date(quote.valid_until) < new Date();
  };

  const canUpdateStatus = (currentStatus: string, newStatus: string) => {
    const statusFlow: Record<string, string[]> = {
      draft: ['sent', 'rejected'],
      sent: ['accepted', 'rejected', 'expired'],
      accepted: [],
      rejected: ['draft'],
      expired: ['draft'],
    };
    return statusFlow[currentStatus]?.includes(newStatus) || false;
  };

  const generatePDF = async () => {
    if (!quote) return;

    try {
      setGeneratingPdf(true);
      const response = await fetch(`/api/quotes/${quoteId}/pdf`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        // Open the HTML version in a new window for printing
        const printWindow = window.open(`/api/quotes/${quoteId}/pdf?format=html`, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 1000);
          };
        }
      } else {
        setError(data.error?.message || 'Failed to generate PDF');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error generating PDF:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const [emailForm, setEmailForm] = useState({
    to_email: '',
    cc_emails: [] as string[],
    subject: '',
    message: '',
    include_pdf: true,
  });

  useEffect(() => {
    if (quote && showEmailForm && !emailForm.to_email) {
      // Pre-populate email form with customer details
      setEmailForm(prev => ({
        ...prev,
        to_email: quote.customer_info.email || '',
        subject: `Heat Pump Proposal - ${quote.quote_number}`,
        message: `Dear ${quote.customer_info.name},

Thank you for your interest in our heat pump solutions. Please find your detailed proposal attached.

This proposal includes complete equipment specifications, installation details, and pricing information tailored to your specific needs.

Key highlights of your proposal:
• Professional installation by licensed technicians
• High-efficiency equipment with manufacturer warranties
• Comprehensive labor warranty
• All permits and inspections included

This proposal is valid until ${new Date(quote.valid_until).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.

If you have any questions or would like to schedule a follow-up consultation, please don't hesitate to contact us directly.

Best regards,
Heat Pumps Now Team`,
      }));
    }
  }, [quote, showEmailForm]);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailForm.to_email || !emailForm.subject || !emailForm.message) {
      setError('Please fill in all required email fields');
      return;
    }

    try {
      setSendingEmail(true);
      setError('');

      const response = await fetch(`/api/quotes/${quoteId}/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(emailForm),
      });

      const data = await response.json();

      if (data.success) {
        setShowEmailForm(false);
        setEmailForm({
          to_email: '',
          cc_emails: [],
          subject: '',
          message: '',
          include_pdf: true,
        });
        
        // Refresh quote data to update status if needed
        fetchQuoteDetails();
        
        // Show success message
        alert(`Proposal email sent successfully to ${emailForm.to_email}`);
      } else {
        setError(data.error?.message || 'Failed to send email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error sending email:', err);
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {user && <SalesPortalHeader user={user} />}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Quote Details</h1>
              <Button variant="outline" onClick={() => router.back()}>
                Back to Quotes
              </Button>
            </div>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading quote...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gray-50">
        <SalesPortalHeader user={user} />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0 space-y-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Quote Details</h1>
              <Button variant="outline" onClick={() => router.back()}>
                Back to Quotes
              </Button>
            </div>
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error || 'Quote not found'}
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{quote.quote_number}</h1>
          <p className="text-gray-600">{quote.quote_name}</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(quote.status)}`}>
            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
          </span>
          <Button variant="outline" onClick={() => router.back()}>
            Back to Quotes
          </Button>
        </div>
      </div>

      {/* Status Update Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quote Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {canUpdateStatus(quote.status, 'sent') && (
              <Button
                onClick={() => updateQuoteStatus('sent')}
                disabled={updating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updating ? 'Updating...' : 'Send Quote'}
              </Button>
            )}
            
            {canUpdateStatus(quote.status, 'accepted') && (
              <Button
                onClick={() => updateQuoteStatus('accepted')}
                disabled={updating}
                className="bg-green-600 hover:bg-green-700"
              >
                {updating ? 'Updating...' : 'Mark Accepted'}
              </Button>
            )}
            
            {canUpdateStatus(quote.status, 'rejected') && (
              <Button
                onClick={() => updateQuoteStatus('rejected')}
                disabled={updating}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                {updating ? 'Updating...' : 'Mark Rejected'}
              </Button>
            )}

            <Button 
              variant="outline"
              onClick={() => window.open(`/quotes/${quoteId}/display`, '_blank')}
              className="bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              👁️ View Customer Display
            </Button>

            <Button 
              variant="outline"
              onClick={generatePDF}
              disabled={generatingPdf}
            >
              {generatingPdf ? 'Generating...' : 'Generate PDF'}
            </Button>

            <Button 
              variant="outline"
              onClick={() => setShowEmailForm(true)}
              className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              📧 Email Proposal
            </Button>
            
            <Button variant="outline">
              Duplicate Quote
            </Button>
            
            <Button variant="outline">
              Edit Quote
            </Button>
          </div>
          
          {isQuoteExpired() && quote.status !== 'expired' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                ⚠️ This quote has expired. Consider extending the validity or creating a new quote.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quote Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {quote.customer_info.name}
                  </h3>
                  <p className="text-sm text-gray-600">Opportunity #{quote.opportunity_id}</p>
                  {quote.customer_info.email && (
                    <p className="text-sm text-gray-600">📧 {quote.customer_info.email}</p>
                  )}
                  {quote.customer_info.phone && (
                    <p className="text-sm text-gray-600">📞 {quote.customer_info.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Lead #{quote.lead_number}</p>
                  <p className="text-sm text-gray-600">Estimate #{quote.estimate_id}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Items</CardTitle>
            </CardHeader>
            <CardContent>
              {quote.line_items && quote.line_items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-gray-200">
                      <tr>
                        <th className="text-left py-2 text-sm font-medium text-gray-900">Item</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-900">Qty</th>
                        <th className="text-right py-2 text-sm font-medium text-gray-900">Cost</th>
                        <th className="text-right py-2 text-sm font-medium text-gray-900">Selling Price</th>
                        <th className="text-right py-2 text-sm font-medium text-gray-900">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {quote.line_items.map((item, index) => (
                        <tr key={index}>
                          <td className="py-3">
                            <div className="text-sm font-medium text-gray-900">{item.item_code}</div>
                            <div className="text-xs text-gray-500">{item.description}</div>
                          </td>
                          <td className="py-3 text-center text-sm text-gray-900">{item.quantity}</td>
                          <td className="py-3 text-right text-sm text-gray-900">{formatCurrency(item.cost)}</td>
                          <td className="py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(item.selling_price)}</td>
                          <td className="py-3 text-right text-sm text-gray-900">
                            {item.margin_percentage ? `${item.margin_percentage.toFixed(1)}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-600 text-center py-4">No items in this quote yet</p>
              )}
            </CardContent>
          </Card>

          {/* Quote Notes */}
          {quote.notes && quote.notes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {quote.notes.map((note: any, index: number) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <p className="font-medium text-sm">{note.subject}</p>
                      <p className="text-gray-700 text-sm mt-1">{note.text}</p>
                      <p className="text-xs text-gray-500 mt-2">— {note.agent_name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quote Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Cost:</span>
                <span className="font-medium">{formatCurrency(quote.total_cost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Markup Applied:</span>
                <span className="font-medium">{formatCurrency(quote.total_margin)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Price:</span>
                  <span className="text-blue-600">{formatCurrency(quote.total_selling_price)}</span>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Margin %:</span>
                <span>{quote.margin_percentage.toFixed(1)}%</span>
              </div>
              
              {quote.global_markup && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-gray-700">Global Markup Applied:</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Overhead:</span>
                      <span>{quote.global_markup.overhead || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk:</span>
                      <span>{quote.global_markup.risk || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit:</span>
                      <span>{quote.global_markup.profit || 0}%</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quote Info */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Quote Number:</span>
                <div className="font-medium">{quote.quote_number}</div>
              </div>
              <div>
                <span className="text-gray-600">Created:</span>
                <div className="font-medium">{formatDate(quote.created_at)}</div>
              </div>
              <div>
                <span className="text-gray-600">Last Updated:</span>
                <div className="font-medium">{formatDate(quote.updated_at)}</div>
              </div>
              <div>
                <span className="text-gray-600">Valid Until:</span>
                <div className={`font-medium ${isQuoteExpired() ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatDate(quote.valid_until)}
                  {isQuoteExpired() && ' (Expired)'}
                </div>
              </div>
              {quote.terms_content && (
                <div>
                  <span className="text-gray-600">Terms:</span>
                  <div className="text-xs text-gray-700 mt-1">{quote.terms_content}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Email Form Modal */}
      {showEmailForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Email Proposal</CardTitle>
              <p className="text-sm text-gray-600">Send proposal {quote.quote_number} to customer</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendEmail} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="To Email"
                    type="email"
                    value={emailForm.to_email}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, to_email: e.target.value }))}
                    placeholder="customer@example.com"
                    required
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CC Emails (optional)</label>
                    <input
                      type="text"
                      value={emailForm.cc_emails.join(', ')}
                      onChange={(e) => setEmailForm(prev => ({ 
                        ...prev, 
                        cc_emails: e.target.value.split(',').map(email => email.trim()).filter(email => email) 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="email1@example.com, email2@example.com"
                    />
                  </div>
                </div>

                <Input
                  label="Subject"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Heat Pump Proposal"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={emailForm.message}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={10}
                    placeholder="Enter your message to the customer..."
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="include_pdf"
                    checked={emailForm.include_pdf}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, include_pdf: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="include_pdf" className="text-sm text-gray-700">
                    Include proposal as attachment
                  </label>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Email Preview Info:</h4>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p><strong>To:</strong> {emailForm.to_email || 'Not specified'}</p>
                    {emailForm.cc_emails.length > 0 && (
                      <p><strong>CC:</strong> {emailForm.cc_emails.join(', ')}</p>
                    )}
                    <p><strong>From:</strong> Heat Pumps Now &lt;info@heatpumpsnow.com&gt;</p>
                    <p><strong>Attachment:</strong> {emailForm.include_pdf ? 'Proposal HTML document' : 'None'}</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1" disabled={sendingEmail}>
                    {sendingEmail ? 'Sending...' : '📧 Send Email'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowEmailForm(false)}
                    className="flex-1"
                    disabled={sendingEmail}
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
      </main>
    </div>
  );
}