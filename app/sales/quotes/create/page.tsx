'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import SalesPortalHeader from '@/components/SalesPortalHeader';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface EstimateLineItem {
  id: string;
  item_code: string;
  line_item_name: string;
  quantity: number;
  hours: number;
  labor_rate: number;
  material_cost: number;
  total_labor_cost: number;
  total_material_cost: number;
  total_cost: number;
  cost_group_name: string;
  cost_group_code: string;
  unit_of_measure: string;
}

interface Estimate {
  id: string;
  estimate_number: string;
  opportunity_id: string;
  project_name: string;
  total_equipment_cost: number;
  total_labor_cost: number;
  total_material_cost: number;
  total_cost: number;
}

interface MarkupSettings {
  overhead: number;
  risk: number;
  profit: number;
}

interface QuoteLineItem extends EstimateLineItem {
  selling_price?: number;
  margin_amount?: number;
  margin_percentage?: number;
  custom_markup?: MarkupSettings;
}

interface CostGroup {
  code: string;
  name: string;
  items: QuoteLineItem[];
  totalCost: number;
  totalSellingPrice: number;
  custom_markup?: MarkupSettings;
}

interface Note {
  id: string;
  subject: string;
  text: string;
  agent_name: string;
  created_at: string;
}

// Standard Terms & Conditions Templates
const TERMS_TEMPLATES = [
  {
    id: 'standard',
    name: 'Standard Installation',
    content: 'Payment due upon completion. 10-year parts warranty, 1-year labor warranty. Customer responsible for providing clear access to work areas.'
  },
  {
    id: 'commercial',
    name: 'Commercial Service',
    content: 'Net 30 payment terms. 5-year parts warranty, 90-day labor warranty. Maintenance agreement available. Prevailing wage rates apply.'
  },
  {
    id: 'emergency',
    name: 'Emergency Service',
    content: 'Payment due upon completion. Emergency rates apply. 1-year parts warranty, 30-day labor warranty. After-hours service charges included.'
  },
  {
    id: 'maintenance',
    name: 'Maintenance Agreement',
    content: 'Annual payment in advance. Includes 2 scheduled maintenance visits. Priority service. 15% discount on repairs. Parts and labor warranties extended.'
  }
];

function QuoteCreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Get parameters from URL
  const opportunityId = searchParams.get('opportunity_id');
  const estimateId = searchParams.get('estimate_id');
  
  // State for estimate and line items
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([]);
  const [costGroups, setCostGroups] = useState<CostGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedGroupMarkups, setExpandedGroupMarkups] = useState<Set<string>>(new Set());
  const [expandedItemMarkups, setExpandedItemMarkups] = useState<Set<string>>(new Set());
  
  // Global markup percentages
  const [globalMarkup, setGlobalMarkup] = useState<MarkupSettings>({
    overhead: 10,
    risk: 5,
    profit: 20
  });
  
  // Quote details
  const [quoteName, setQuoteName] = useState('');
  const [selectedTermsTemplate, setSelectedTermsTemplate] = useState('standard');
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteSubject, setNewNoteSubject] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push('/login');
      return;
    }

    // Set default valid until date (30 days from now)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setValidUntil(defaultDate.toISOString().split('T')[0]);

    if (estimateId) {
      fetchEstimateAndLineItems(estimateId);
    } else if (opportunityId) {
      // Try to find the latest completed estimate for this opportunity
      fetchLatestEstimate(opportunityId);
    }
  }, [estimateId, opportunityId, router]);

  // Handle click outside to close markup popups
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if click is outside markup popup areas
      // We'll look for clicks on elements that aren't part of the markup controls
      const isMarkupControl = target.closest('.markup-popup') || 
                             target.closest('.markup-toggle-button');
      
      if (!isMarkupControl) {
        // Close all markup popups
        setExpandedGroupMarkups(new Set<string>());
        setExpandedItemMarkups(new Set<string>());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Create quote once estimate is loaded
  useEffect(() => {
    if (estimate && !quoteId && !loading && !isSaving) {
      // Create the quote on first load
      console.log('Creating initial quote for estimate:', estimate.id);
      saveQuote(true).then(id => {
        if (id) {
          console.log('Initial quote created:', id);
        }
      });
    }
  }, [estimate]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!quoteId || loading) return;
    
    const timeoutId = setTimeout(() => {
      saveQuote();
    }, 2000); // Auto-save after 2 seconds of no changes
    
    return () => clearTimeout(timeoutId);
  }, [lineItems, globalMarkup, costGroups, notes, quoteName, selectedTermsTemplate, validUntil]);

  const fetchEstimateAndLineItems = async (estId: string) => {
    try {
      setLoading(true);
      
      // Fetch estimate details
      const estResponse = await fetch(`/api/estimates/${estId}`);
      const estResult = await estResponse.json();
      
      if (!estResult.success) {
        setError('Failed to load estimate');
        return;
      }
      
      setEstimate(estResult.data);
      setQuoteName(`Quote for ${estResult.data.project_name || 'Project'}`);
      
      // Fetch line items
      const itemsResponse = await fetch(`/api/estimates/${estId}/line-items`);
      const itemsResult = await itemsResponse.json();
      
      if (itemsResult.success && itemsResult.data.line_items) {
        // Convert estimate line items to quote line items with initial pricing
        const quoteItems = itemsResult.data.line_items.map((item: EstimateLineItem) => ({
          ...item,
          selling_price: calculateSellingPrice(item.total_cost, globalMarkup),
          margin_amount: calculateSellingPrice(item.total_cost, globalMarkup) - item.total_cost,
          margin_percentage: calculateTotalMargin(globalMarkup)
        }));
        setLineItems(quoteItems);
        
        // Group items by cost group
        updateCostGroups(quoteItems);
        
        // Don't create quote immediately - wait for state to be set
        // Quote will be created on first save action
      }
    } catch (err) {
      console.error('Error fetching estimate:', err);
      setError('Failed to load estimate data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestEstimate = async (oppId: string) => {
    try {
      // Fetch opportunity to get estimates
      const response = await fetch(`/api/opportunities/${oppId}`);
      const result = await response.json();
      
      if (result.success && result.data.estimates && result.data.estimates.length > 0) {
        // Get the latest completed estimate
        const completedEstimates = result.data.estimates.filter(
          (est: any) => est.status === 'completed' || est.status === 'sent'
        );
        
        if (completedEstimates.length > 0) {
          const latestEstimate = completedEstimates[0];
          fetchEstimateAndLineItems(latestEstimate.id);
        }
      }
    } catch (err) {
      console.error('Error fetching opportunity:', err);
      setError('Failed to load opportunity data');
    }
  };

  // Calculate total margin from the three components
  const calculateTotalMargin = (markup: MarkupSettings) => {
    // Combined margin calculation
    // Formula: Total Margin = 1 - (1 - OH%) × (1 - Risk%) × (1 - Profit%)
    const remaining = (1 - markup.overhead/100) * (1 - markup.risk/100) * (1 - markup.profit/100);
    return (1 - remaining) * 100;
  };

  // Calculate selling price using margin formula: Price = Cost ÷ (1 - Margin%)
  const calculateSellingPrice = (cost: number, markup: MarkupSettings) => {
    const totalMargin = calculateTotalMargin(markup);
    if (totalMargin >= 100) return cost * 10; // Prevent division by zero
    return cost / (1 - totalMargin / 100);
  };

  // Update cost groups when line items change
  const updateCostGroups = (items: QuoteLineItem[], preserveMarkup = true) => {
    const grouped = items.reduce((acc, item) => {
      const groupKey = item.cost_group_code || 'OTHER';
      if (!acc[groupKey]) {
        // Preserve existing custom_markup if preserveMarkup is true
        const existingGroup = preserveMarkup ? costGroups.find(g => g.code === groupKey) : null;
        acc[groupKey] = {
          code: groupKey,
          name: item.cost_group_name || 'Other',
          items: [],
          totalCost: 0,
          totalSellingPrice: 0,
          custom_markup: existingGroup?.custom_markup
        };
      }
      acc[groupKey].items.push(item);
      acc[groupKey].totalCost += item.total_cost;
      acc[groupKey].totalSellingPrice += item.selling_price || 0;
      return acc;
    }, {} as Record<string, CostGroup>);

    setCostGroups(Object.values(grouped).sort((a, b) => a.code.localeCompare(b.code)));
  };

  // Apply global markup to all items
  const applyGlobalMarkup = () => {
    const updatedItems = lineItems.map(item => {
      // Use item's custom markup if set, otherwise use group's custom markup, otherwise use global
      const group = costGroups.find(g => g.code === item.cost_group_code);
      const markup = item.custom_markup || group?.custom_markup || globalMarkup;
      
      return {
        ...item,
        selling_price: calculateSellingPrice(item.total_cost, markup),
        margin_amount: calculateSellingPrice(item.total_cost, markup) - item.total_cost,
        margin_percentage: calculateTotalMargin(markup)
      };
    });
    setLineItems(updatedItems);
    updateCostGroups(updatedItems);
  };

  // Apply markup to a specific cost group
  const applyGroupMarkup = (groupCode: string, markup: MarkupSettings) => {
    // First update the cost groups with the new markup
    const updatedGroups = costGroups.map(group => {
      if (group.code === groupCode) {
        return { ...group, custom_markup: markup };
      }
      return group;
    });
    setCostGroups(updatedGroups);

    // Then update line items in this group (only those without custom markup)
    const updatedItems = lineItems.map(item => {
      if (item.cost_group_code === groupCode && !item.custom_markup) {
        return {
          ...item,
          selling_price: calculateSellingPrice(item.total_cost, markup),
          margin_amount: calculateSellingPrice(item.total_cost, markup) - item.total_cost,
          margin_percentage: calculateTotalMargin(markup)
        };
      }
      return item;
    });
    setLineItems(updatedItems);
    
    // Update cost groups but preserve the markup we just set
    const groupedWithMarkup = updatedItems.reduce((acc, item) => {
      const groupKey = item.cost_group_code || 'OTHER';
      if (!acc[groupKey]) {
        const existingGroup = updatedGroups.find(g => g.code === groupKey);
        acc[groupKey] = {
          code: groupKey,
          name: item.cost_group_name || 'Other',
          items: [],
          totalCost: 0,
          totalSellingPrice: 0,
          custom_markup: existingGroup?.custom_markup
        };
      }
      acc[groupKey].items.push(item);
      acc[groupKey].totalCost += item.total_cost;
      acc[groupKey].totalSellingPrice += item.selling_price || 0;
      return acc;
    }, {} as Record<string, CostGroup>);

    setCostGroups(Object.values(groupedWithMarkup).sort((a, b) => a.code.localeCompare(b.code)));
  };

  // Apply markup to a specific line item
  const applyItemMarkup = (itemId: string, markup: MarkupSettings) => {
    const updatedItems = lineItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          custom_markup: markup,
          selling_price: calculateSellingPrice(item.total_cost, markup),
          margin_amount: calculateSellingPrice(item.total_cost, markup) - item.total_cost,
          margin_percentage: calculateTotalMargin(markup)
        };
      }
      return item;
    });
    setLineItems(updatedItems);
    updateCostGroups(updatedItems);
  };

  // Update individual line item price directly
  const updateLineItemPrice = (itemId: string, newPrice: number) => {
    const updatedItems = lineItems.map(item => {
      if (item.id === itemId) {
        const marginAmount = newPrice - item.total_cost;
        const marginPercentage = newPrice > 0 
          ? ((marginAmount / newPrice) * 100)
          : 0;
        
        // Calculate implied markup from the new price
        const impliedMarkup: MarkupSettings = {
          overhead: 0,
          risk: 0,
          profit: marginPercentage
        };
        
        return {
          ...item,
          custom_markup: impliedMarkup,
          selling_price: newPrice,
          margin_amount: marginAmount,
          margin_percentage: marginPercentage
        };
      }
      return item;
    });
    setLineItems(updatedItems);
    updateCostGroups(updatedItems);
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

  const toggleGroupMarkup = (groupCode: string) => {
    // Close all item markup windows when opening a group markup
    setExpandedItemMarkups(new Set<string>());
    
    const newExpanded = new Set<string>();
    // Only allow one group markup window open at a time
    if (!expandedGroupMarkups.has(groupCode)) {
      newExpanded.add(groupCode);
    }
    setExpandedGroupMarkups(newExpanded);
  };

  const toggleItemMarkup = (itemId: string) => {
    // Close all group markup windows when opening an item markup
    setExpandedGroupMarkups(new Set<string>());
    
    const newExpanded = new Set<string>();
    // Only allow one item markup window open at a time
    if (!expandedItemMarkups.has(itemId)) {
      newExpanded.add(itemId);
    }
    setExpandedItemMarkups(newExpanded);
  };

  const addNote = () => {
    if (!newNoteSubject || !newNoteText || !user) return;
    
    const note: Note = {
      id: Date.now().toString(),
      subject: newNoteSubject,
      text: newNoteText,
      agent_name: `${user.firstName} ${user.lastName}`,
      created_at: new Date().toISOString()
    };
    
    setNotes([...notes, note]);
    setNewNoteSubject('');
    setNewNoteText('');
  };

  const removeNote = (noteId: string) => {
    setNotes(notes.filter(n => n.id !== noteId));
  };

  const calculateTotals = () => {
    const totalCost = lineItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);
    const totalSellingPrice = lineItems.reduce((sum, item) => sum + (item.selling_price || 0), 0);
    const totalMarginAmount = totalSellingPrice - totalCost;
    const totalLaborHours = lineItems.reduce((sum, item) => {
      const hours = parseFloat(String(item.hours)) || 0;
      const quantity = parseFloat(String(item.quantity)) || 1;
      return sum + (hours * quantity);
    }, 0);
    
    return {
      totalCost,
      totalSellingPrice,
      totalMarginAmount,
      totalMarginPercentage: totalSellingPrice > 0 ? (totalMarginAmount / totalSellingPrice) * 100 : 0,
      totalLaborHours
    };
  };

  // Create or update quote
  const saveQuote = async (isInitialCreate = false) => {
    if (!estimate) {
      if (!isInitialCreate) setError('Please ensure estimate is loaded');
      return null;
    }

    try {
      setIsSaving(true);
      
      const selectedTemplate = TERMS_TEMPLATES.find(t => t.id === selectedTermsTemplate);
      
      const payload = {
        opportunity_id: estimate.opportunity_id,
        estimate_id: estimate.id,
        quote_name: quoteName || `Quote for ${estimate.project_name || 'Project'}`,
        items: lineItems.map(item => ({
          line_item_id: item.id,
          item_code: item.item_code,
          description: item.line_item_name,
          quantity: item.quantity,
          cost: item.total_cost,
          selling_price: item.selling_price,
          margin_percentage: item.margin_percentage,
          custom_markup: item.custom_markup
        })),
        global_markup: globalMarkup,
        group_markups: costGroups.filter(g => g.custom_markup).map(g => ({
          group_code: g.code,
          markup: g.custom_markup
        })),
        terms_template_id: selectedTermsTemplate,
        terms_content: selectedTemplate?.content,
        notes: notes,
        valid_until: validUntil
      };

      const url = quoteId 
        ? `/api/quotes/${quoteId}`
        : '/api/quotes/from-estimate';
      
      const method = quoteId ? 'PUT' : 'POST';

      console.log('Saving quote with payload:', payload);
      console.log('URL:', url, 'Method:', method);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      
      if (result.success) {
        if (!quoteId && result.data.id) {
          setQuoteId(result.data.id);
        }
        setLastSaved(new Date());
        if (!isInitialCreate) {
          // Show a subtle save indicator
          setError('');
        }
        return result.data.id;
      } else {
        console.error('Quote save failed:', result.error);
        const errorMessage = result.error?.message || result.error?.details || 'Failed to save quote';
        if (!isInitialCreate) {
          setError(errorMessage);
        }
        return null;
      }
    } catch (err) {
      console.error('Error saving quote:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save quote';
      if (!isInitialCreate) {
        setError(errorMessage);
      }
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // Navigate to quote view
  const handleSaveAndView = async () => {
    const id = quoteId || await saveQuote();
    if (id) {
      router.push(`/quotes/${id}`);
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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totals = calculateTotals();

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gray-50">
        {user && <SalesPortalHeader user={user} />}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading estimate data...</p>
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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push(`/opportunities/${estimate?.opportunity_id}`)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Create Quote from Estimate</h1>
                <p className="text-sm text-gray-500">
                  Apply markups and convert estimate #{estimate?.estimate_number} to customer quote
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {lastSaved && (
                <span className="text-sm text-gray-500">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {isSaving && (
                <span className="text-sm text-blue-600">
                  Saving...
                </span>
              )}
              <Button 
                onClick={handleSaveAndView}
                disabled={loading || isSaving}
              >
                {quoteId ? 'View Quote' : 'Save Quote'}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Line Items with Pricing - Main Content (3/4 width) */}
            <div className="lg:col-span-3 space-y-6">
              {/* Quote Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Quote Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Quote Name"
                      value={quoteName}
                      onChange={(e) => setQuoteName(e.target.value)}
                      placeholder="e.g., HVAC System Quote"
                      required
                    />
                    <Input
                      label="Valid Until"
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Terms & Conditions Template
                    </label>
                    <select
                      value={selectedTermsTemplate}
                      onChange={(e) => setSelectedTermsTemplate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {TERMS_TEMPLATES.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {TERMS_TEMPLATES.find(t => t.id === selectedTermsTemplate)?.content}
                    </p>
                  </div>
                  
                  {/* Notes Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add Note
                    </label>
                    <div className="space-y-2">
                      <Input
                        placeholder="Subject line..."
                        value={newNoteSubject}
                        onChange={(e) => setNewNoteSubject(e.target.value)}
                      />
                      <textarea
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="Note text..."
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={addNote}
                        disabled={!newNoteSubject || !newNoteText}
                      >
                        Add Note
                      </Button>
                    </div>
                    
                    {notes.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                        {notes.map(note => (
                          <div key={note.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{note.subject}</p>
                                <p className="text-sm text-gray-600 mt-1">{note.text}</p>
                                <p className="text-xs text-gray-400 mt-2">
                                  — {note.agent_name} • {formatDate(note.created_at)}
                                </p>
                              </div>
                              <button
                                onClick={() => removeNote(note.id)}
                                className="text-red-500 hover:text-red-700 text-sm ml-2"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Line Items with Pricing */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Line Items & Pricing</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Adjust markups at global, group, or item level
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedGroups(new Set(costGroups.map(g => g.code)))}
                      >
                        Expand All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedGroups(new Set())}
                      >
                        Collapse All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {costGroups.map((group, index) => {
                    const isExpanded = expandedGroups.has(group.code);
                    const isMarkupExpanded = expandedGroupMarkups.has(group.code);
                    const groupMarkup = group.custom_markup || globalMarkup;
                    const groupMargin = group.totalSellingPrice > 0 
                      ? ((group.totalSellingPrice - group.totalCost) / group.totalSellingPrice) * 100
                      : 0;
                    
                    return (
                      <div key={group.code} className={`${index > 0 ? 'border-t' : ''}`}>
                        {/* Group Header */}
                        <div className="px-6 py-4 bg-gray-50">
                          <div 
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => toggleGroup(group.code)}
                          >
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
                                  {group.items.length} items • 
                                  {group.custom_markup && ' Custom markup applied'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {formatCurrency(group.totalSellingPrice)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Cost: {formatCurrency(group.totalCost)} | Margin: {groupMargin.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                          
                          {/* Group Markup Controls */}
                          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroupMarkup(group.code);
                              }}
                              className="markup-toggle-button text-xs text-blue-600 hover:text-blue-800"
                            >
                              {isMarkupExpanded ? 'Hide' : 'Show'} Group Markup Controls
                            </button>
                            
                            {isMarkupExpanded && (
                              <div className="markup-popup mt-3 p-3 bg-white rounded-lg border border-gray-200">
                                <div className="grid grid-cols-3 gap-3">
                                  <div>
                                    <label className="text-xs font-medium text-gray-700">
                                      Overhead %
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="50"
                                      step="1"
                                      value={groupMarkup.overhead}
                                      onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                                        const newMarkup = { ...groupMarkup, overhead: value };
                                        applyGroupMarkup(group.code, newMarkup);
                                      }}
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-700">
                                      Risk %
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="30"
                                      step="1"
                                      value={groupMarkup.risk}
                                      onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                                        const newMarkup = { ...groupMarkup, risk: value };
                                        applyGroupMarkup(group.code, newMarkup);
                                      }}
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-700">
                                      Profit %
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="50"
                                      step="1"
                                      value={groupMarkup.profit}
                                      onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                                        const newMarkup = { ...groupMarkup, profit: value };
                                        applyGroupMarkup(group.code, newMarkup);
                                      }}
                                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                    />
                                  </div>
                                </div>
                                <div className="mt-2 flex justify-between items-center">
                                  <span className="text-xs text-gray-600">
                                    Total Margin: {calculateTotalMargin(groupMarkup).toFixed(1)}%
                                  </span>
                                  {group.custom_markup && (
                                    <button
                                      onClick={() => {
                                        const updatedGroups = costGroups.map(g => {
                                          if (g.code === group.code) {
                                            return { ...g, custom_markup: undefined };
                                          }
                                          return g;
                                        });
                                        setCostGroups(updatedGroups);
                                        applyGlobalMarkup();
                                      }}
                                      className="text-xs text-red-600 hover:text-red-800"
                                    >
                                      Reset to Global
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Expandable Line Items */}
                        {isExpanded && (
                          <div className="bg-white">
                            <table className="min-w-full">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">
                                    Item
                                  </th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">
                                    Qty
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                                    Cost
                                  </th>
                                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-600 uppercase">
                                    Markup
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                                    Selling Price
                                  </th>
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-600 uppercase">
                                    Margin
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {group.items.map((item: QuoteLineItem) => {
                                  const itemMarkup = item.custom_markup || group.custom_markup || globalMarkup;
                                  const showItemMarkup = expandedItemMarkups.has(item.id);
                                  
                                  return (
                                    <tr key={item.id}>
                                      <td className="px-4 py-2">
                                        <p className="text-xs font-medium text-gray-900">{item.item_code}</p>
                                        <p className="text-xs text-gray-600">{item.line_item_name}</p>
                                      </td>
                                      <td className="px-4 py-2 text-center">
                                        <span className="text-xs">{item.quantity} {item.unit_of_measure}</span>
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <span className="text-xs text-gray-600">
                                          {formatCurrency(item.total_cost)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="text-center relative">
                                          <button
                                            onClick={() => toggleItemMarkup(item.id)}
                                            className="markup-toggle-button text-xs text-blue-600 hover:text-blue-800"
                                          >
                                            {item.custom_markup ? `Custom: ${calculateTotalMargin(itemMarkup).toFixed(1)}%` : 'Adjust'}
                                          </button>
                                          {showItemMarkup && (
                                            <div className="markup-popup absolute z-10 mt-1 p-3 bg-white rounded-lg shadow-lg border border-gray-200" style={{minWidth: '200px'}}>
                                              <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                  <label className="text-xs font-medium">Overhead</label>
                                                  <div className="flex items-center">
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      max="50"
                                                      step="1"
                                                      value={itemMarkup.overhead}
                                                      onChange={(e) => {
                                                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                                                        const newMarkup = { ...itemMarkup, overhead: value };
                                                        applyItemMarkup(item.id, newMarkup);
                                                      }}
                                                      className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs ml-1">%</span>
                                                  </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <label className="text-xs font-medium">Risk</label>
                                                  <div className="flex items-center">
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      max="30"
                                                      step="1"
                                                      value={itemMarkup.risk}
                                                      onChange={(e) => {
                                                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                                                        const newMarkup = { ...itemMarkup, risk: value };
                                                        applyItemMarkup(item.id, newMarkup);
                                                      }}
                                                      className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs ml-1">%</span>
                                                  </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <label className="text-xs font-medium">Profit</label>
                                                  <div className="flex items-center">
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      max="50"
                                                      step="1"
                                                      value={itemMarkup.profit}
                                                      onChange={(e) => {
                                                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                                                        const newMarkup = { ...itemMarkup, profit: value };
                                                        applyItemMarkup(item.id, newMarkup);
                                                      }}
                                                      className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs ml-1">%</span>
                                                  </div>
                                                </div>
                                                <div className="pt-2 border-t">
                                                  <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-600">Total:</span>
                                                    <span className="text-xs font-bold">{calculateTotalMargin(itemMarkup).toFixed(1)}%</span>
                                                  </div>
                                                </div>
                                                {item.custom_markup && (
                                                  <button
                                                    onClick={() => {
                                                      const updatedItems = lineItems.map(i => {
                                                        if (i.id === item.id) {
                                                          const markup = group.custom_markup || globalMarkup;
                                                          return {
                                                            ...i,
                                                            custom_markup: undefined,
                                                            selling_price: calculateSellingPrice(i.total_cost, markup),
                                                            margin_amount: calculateSellingPrice(i.total_cost, markup) - i.total_cost,
                                                            margin_percentage: calculateTotalMargin(markup)
                                                          };
                                                        }
                                                        return i;
                                                      });
                                                      setLineItems(updatedItems);
                                                      updateCostGroups(updatedItems);
                                                      toggleItemMarkup(item.id);
                                                    }}
                                                    className="text-xs text-red-600"
                                                  >
                                                    Reset
                                                  </button>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="flex items-center justify-end">
                                          <span className="text-xs text-gray-400 mr-1">$</span>
                                          <input
                                            type="number"
                                            value={item.selling_price?.toFixed(2) || '0'}
                                            onChange={(e) => updateLineItemPrice(item.id, parseFloat(e.target.value) || 0)}
                                            className="w-20 px-1 py-0.5 border border-gray-200 rounded text-xs text-right focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                            min="0"
                                            step="10"
                                          />
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <span className="text-xs font-medium text-green-600">
                                          {formatCurrency(item.margin_amount || 0)}
                                        </span>
                                        <span className="text-xs text-gray-500 ml-1">
                                          ({item.margin_percentage?.toFixed(1)}%)
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Markup Controls & Summary Sidebar (1/4 width) */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                {/* Global Markup Controls */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Global Markup Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Overhead ({globalMarkup.overhead}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="30"
                        value={globalMarkup.overhead}
                        onChange={(e) => {
                          setGlobalMarkup({ ...globalMarkup, overhead: Number(e.target.value) });
                        }}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Risk ({globalMarkup.risk}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={globalMarkup.risk}
                        onChange={(e) => {
                          setGlobalMarkup({ ...globalMarkup, risk: Number(e.target.value) });
                        }}
                        className="w-full"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Profit ({globalMarkup.profit}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="40"
                        value={globalMarkup.profit}
                        onChange={(e) => {
                          setGlobalMarkup({ ...globalMarkup, profit: Number(e.target.value) });
                        }}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="pt-3 border-t">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">Total Margin:</span>
                        <span className="text-sm font-bold text-blue-600">
                          {calculateTotalMargin(globalMarkup).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Default for all items
                      </p>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={applyGlobalMarkup}
                    >
                      Apply to All Items
                    </Button>
                  </CardContent>
                </Card>

                {/* Quote Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quote Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Cost</span>
                        <span className="font-medium">{formatCurrency(totals.totalCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Total Margin</span>
                        <span className="font-medium text-green-600">
                          {formatCurrency(totals.totalMarginAmount)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t">
                      <div className="flex justify-between">
                        <span className="font-medium">Quote Total</span>
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency(totals.totalSellingPrice)}
                        </span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">Margin</span>
                        <span className="text-xs font-medium">
                          {totals.totalMarginPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Labor Hours</span>
                        <span className="font-medium">{(totals.totalLaborHours || 0).toFixed(1)} hrs</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Markup Hierarchy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Markup Hierarchy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs space-y-1 text-gray-600">
                      <p>1. Item-level markup (highest priority)</p>
                      <p>2. Group-level markup</p>
                      <p>3. Global markup (default)</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Formula: Price = Cost ÷ (1 - Margin%)
                    </p>
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

export default function CreateQuotePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <QuoteCreateContent />
    </Suspense>
  );
}