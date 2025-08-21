'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Chevron icons as inline SVG components
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

interface LineItem {
  id: string;
  item_code: string;
  description: string;
  line_item_name?: string;
  quantity: number;
  unit?: string;
  cost: number;
  selling_price: number;
  total_cost?: number;
  hours?: number;
  labor_rate?: number;
  material_cost?: number;
  total_labor_cost?: number;
  total_material_cost?: number;
}

interface LineItemGroup {
  id: string;
  name: string;
  code: string;
  description?: string;
  line_items: LineItem[];
  total_cost: number;
  total_selling_price: number;
  total_labor?: number;
  total_material?: number;
}

interface System {
  id: string;
  name: string;
  description?: string;
  groups: LineItemGroup[];
  total_cost: number;
  total_selling_price: number;
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
  line_items: any[];
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

export default function QuoteDisplayPage() {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [systems, setSystems] = useState<System[]>([]);
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  useEffect(() => {
    if (quoteId) {
      fetchQuoteDetails();
    }
  }, [quoteId]);

  const fetchQuoteDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quotes/${quoteId}`);
      const data = await response.json();

      if (data.success) {
        const quoteData = data.data.quote || data.data;
        setQuote(quoteData);
        
        // Organize line items into hierarchical structure
        if (quoteData.line_items && Array.isArray(quoteData.line_items)) {
          const organized = organizeLineItems(quoteData.line_items);
          setSystems(organized);
          // Auto-expand first system by default
          if (organized.length > 0) {
            setExpandedSystems(new Set([organized[0].id]));
          }
        }
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

  const organizeLineItems = (items: any[]): System[] => {
    // Organize by system (top level) -> line item groups (middle) -> line items (bottom)
    const systemsMap = new Map<string, System>();
    
    items.forEach(item => {
      // Determine system - could be based on system_type, phase, or default to "Main System"
      const systemName = item.system_name || item.system_type || 'Main System';
      const systemId = systemName.toLowerCase().replace(/\s+/g, '-');
      
      // Determine line item group - this is the middle level (e.g., Demo, Equipment, Labor)
      const groupName = item.cost_group || item.group_name || item.line_item_group || item.category || 'General';
      const groupId = `${systemId}-${groupName.toLowerCase().replace(/\s+/g, '-')}`;
      const groupCode = item.cost_group_code || item.group_code || groupName.substring(0, 3).toUpperCase();
      
      // Get or create system
      if (!systemsMap.has(systemId)) {
        systemsMap.set(systemId, {
          id: systemId,
          name: systemName,
          description: item.system_description,
          groups: [],
          total_cost: 0,
          total_selling_price: 0
        });
      }
      
      const system = systemsMap.get(systemId)!;
      
      // Get or create group within system
      let group = system.groups.find(g => g.id === groupId);
      if (!group) {
        group = {
          id: groupId,
          name: groupName,
          code: groupCode,
          description: item.group_description,
          line_items: [],
          total_cost: 0,
          total_selling_price: 0,
          total_labor: 0,
          total_material: 0
        };
        system.groups.push(group);
      }
      
      // Create line item
      const lineItem: LineItem = {
        id: item.id || Math.random().toString(),
        item_code: item.item_code || item.sku || '',
        description: item.description || item.line_item_description || '',
        line_item_name: item.line_item_name || item.name,
        quantity: parseFloat(item.quantity || 1),
        unit: item.unit || item.unit_type || 'EA',
        cost: parseFloat(item.cost || 0),
        selling_price: parseFloat(item.selling_price || item.price || 0),
        total_cost: parseFloat(item.total_cost || item.cost || 0),
        hours: parseFloat(item.hours || item.labor_hours || 0),
        labor_rate: parseFloat(item.labor_rate || 0),
        material_cost: parseFloat(item.material_cost || 0),
        total_labor_cost: parseFloat(item.total_labor_cost || 0),
        total_material_cost: parseFloat(item.total_material_cost || item.material_cost || 0)
      };
      
      // Add to group and update totals
      group.line_items.push(lineItem);
      
      const itemTotal = lineItem.selling_price || (lineItem.cost * lineItem.quantity);
      group.total_cost += lineItem.cost * lineItem.quantity;
      group.total_selling_price += itemTotal;
      group.total_labor += lineItem.total_labor_cost || 0;
      group.total_material += lineItem.total_material_cost || 0;
      
      system.total_cost += lineItem.cost * lineItem.quantity;
      system.total_selling_price += itemTotal;
    });
    
    return Array.from(systemsMap.values());
  };

  const toggleSystem = (systemId: string) => {
    setExpandedSystems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(systemId)) {
        newSet.delete(systemId);
        // Collapse all groups in this system
        const system = systems.find(s => s.id === systemId);
        if (system) {
          system.groups.forEach(g => {
            setExpandedGroups(groups => {
              const newGroups = new Set(groups);
              newGroups.delete(g.id);
              return newGroups;
            });
          });
        }
      } else {
        newSet.add(systemId);
      }
      return newSet;
    });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    const allSystemIds = systems.map(s => s.id);
    setExpandedSystems(new Set(allSystemIds));
    const allGroupIds = systems.flatMap(s => s.groups.map(g => g.id));
    setExpandedGroups(new Set(allGroupIds));
  };

  const collapseAll = () => {
    setExpandedSystems(new Set());
    setExpandedGroups(new Set());
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0000cd] mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading your quote...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Quote not found'}</p>
          <button 
            onClick={() => router.back()}
            className="text-[#0000cd] hover:underline"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Calculate savings and efficiency metrics
  const annualSavings = Math.round(quote.total_selling_price * 0.20); // Estimated 20% savings
  const paybackPeriod = (quote.total_selling_price / annualSavings).toFixed(1);
  const carbonReduction = Math.round(quote.total_selling_price / 1000); // Tons of CO2

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Brand Logo */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="/logo-horizontal.svg" 
                alt="Heat Pumps Now" 
                className="h-12"
              />
            </div>
            <div className="flex items-center space-x-6">
              <a href="tel:1-800-HEAT-NOW" className="text-gray-600 hover:text-[#0000cd] font-medium">
                📞 1-800-HEAT-NOW
              </a>
              <button 
                onClick={() => window.print()}
                className="bg-[#0000cd] text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Print Quote
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Gradient */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0000cd] via-blue-600 to-[#e75e00] opacity-90"></div>
        <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-10"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-16 text-white">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur rounded-full mb-6">
                <span className="text-sm font-semibold">PROFESSIONAL HVAC QUOTE #{quote.quote_number}</span>
              </div>
              
              <h1 className="text-5xl font-bold mb-6">
                Your Energy-Efficient Future Starts Here
              </h1>
              
              <p className="text-xl mb-8 text-white/90">
                Transform your home comfort with our premium heat pump solutions. 
                Professional installation, exceptional efficiency, lasting value.
              </p>

              <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
                <div className="text-3xl font-bold mb-2">
                  {formatCurrency(quote.total_selling_price)}
                </div>
                <p className="text-white/80">Complete System Investment</p>
                <p className="text-sm text-white/60 mt-2">
                  Valid until {formatDate(quote.valid_until)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                <div className="text-[#e75e00] text-3xl mb-3">🔥</div>
                <div className="text-2xl font-bold">{carbonReduction}</div>
                <p className="text-sm text-white/80">Tons CO₂ Reduced</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                <div className="text-[#e75e00] text-3xl mb-3">💰</div>
                <div className="text-2xl font-bold">{formatCurrency(annualSavings)}</div>
                <p className="text-sm text-white/80">Annual Savings</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                <div className="text-[#e75e00] text-3xl mb-3">📈</div>
                <div className="text-2xl font-bold">{paybackPeriod}</div>
                <p className="text-sm text-white/80">Years Payback</p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
                <div className="text-[#e75e00] text-3xl mb-3">⚡</div>
                <div className="text-2xl font-bold">A++</div>
                <p className="text-sm text-white/80">Energy Rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Executive Summary */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-2xl p-8 border border-blue-100">
            <h2 className="text-2xl font-bold text-[#0000cd] mb-6">Executive Summary</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Customer</p>
                <p className="font-semibold text-gray-900">{quote.customer_info.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Project</p>
                <p className="font-semibold text-gray-900">{quote.quote_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Timeline</p>
                <p className="font-semibold text-gray-900">2-3 Business Days</p>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white rounded-lg">
              <p className="text-gray-700">
                This comprehensive quote includes all equipment, materials, labor, permits, and warranties 
                required for your complete heat pump system installation. Our certified technicians will 
                ensure a seamless installation that maximizes efficiency and comfort.
              </p>
            </div>
          </div>
        </section>

        {/* Detailed Pricing Breakdown with Collapsible Systems */}
        {systems.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#0000cd]">Detailed System Components</h2>
              <div className="flex gap-2">
                <button
                  onClick={expandAll}
                  className="px-4 py-2 text-sm font-medium text-[#0000cd] border border-[#0000cd] rounded-lg hover:bg-blue-50 transition"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Collapse All
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {systems.map((system, systemIndex) => (
                <div key={system.id} className={`${systemIndex > 0 ? 'border-t-4 border-gray-300' : ''}`}>
                  {/* System Header (Top Level) */}
                  <div
                    onClick={() => toggleSystem(system.id)}
                    className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-[#0000cd] to-blue-700 hover:from-blue-700 hover:to-[#0000cd] cursor-pointer transition text-white"
                  >
                    <div className="flex items-center gap-3">
                      {expandedSystems.has(system.id) ? (
                        <ChevronDownIcon className="w-6 h-6 text-white" />
                      ) : (
                        <ChevronRightIcon className="w-6 h-6 text-white" />
                      )}
                      <div>
                        <h3 className="font-bold text-xl">{system.name}</h3>
                        {system.description && (
                          <p className="text-sm text-blue-100 mt-1">{system.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-blue-100">System Investment</div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(system.total_selling_price)}
                      </div>
                    </div>
                  </div>
                  
                  {/* Line Item Groups and Items */}
                  {expandedSystems.has(system.id) && (
                    <div className="bg-gray-50">
                      {system.groups.map((group, groupIndex) => (
                        <div key={group.id} className={`${groupIndex > 0 ? 'border-t-2 border-gray-200' : ''}`}>
                          {/* Line Item Group Header (Middle Level) */}
                          <div
                            onClick={() => toggleGroup(group.id)}
                            className="flex items-center justify-between px-8 py-4 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 cursor-pointer transition"
                          >
                            <div className="flex items-center gap-3">
                              {expandedGroups.has(group.id) ? (
                                <ChevronDownIcon className="w-5 h-5 text-[#0000cd]" />
                              ) : (
                                <ChevronRightIcon className="w-5 h-5 text-[#0000cd]" />
                              )}
                              <div>
                                <div className="font-bold text-lg text-[#0000cd]">
                                  {group.code} - {group.name}
                                </div>
                                {group.description && (
                                  <div className="text-sm text-gray-600">{group.description}</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">
                                {group.line_items.length} item{group.line_items.length !== 1 ? 's' : ''}
                              </div>
                              <div className="text-xl font-bold text-[#0000cd]">
                                {formatCurrency(group.total_selling_price)}
                              </div>
                            </div>
                          </div>
                          
                          {/* Line Items (Bottom Level) */}
                          {expandedGroups.has(group.id) && (
                            <div className="bg-white border-t border-gray-200">
                              <table className="w-full">
                                <thead className="bg-gray-100 text-sm">
                                  <tr>
                                    <th className="text-left py-3 px-10">Item Code & Description</th>
                                    <th className="text-center py-3 px-4">Qty</th>
                                    <th className="text-center py-3 px-4">Unit</th>
                                    <th className="text-right py-3 px-6">Unit Price</th>
                                    <th className="text-right py-3 px-6">Total</th>
                                  </tr>
                                </thead>
                                <tbody className="text-sm">
                                  {group.line_items.map((item, itemIndex) => (
                                    <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                                      <td className="py-4 px-10">
                                        <div className="font-semibold text-gray-900">
                                          {item.item_code || 'ITEM-' + (itemIndex + 1)}
                                        </div>
                                        <div className="text-gray-600 mt-1">
                                          {item.line_item_name || item.description || 'Standard Item'}
                                        </div>
                                      </td>
                                      <td className="py-4 px-4 text-center font-medium text-gray-900">
                                        {item.quantity}
                                      </td>
                                      <td className="py-4 px-4 text-center text-gray-600">
                                        {item.unit || 'EA'}
                                      </td>
                                      <td className="py-4 px-6 text-right text-gray-900">
                                        {formatCurrency(item.selling_price / (item.quantity || 1))}
                                      </td>
                                      <td className="py-4 px-6 text-right font-bold text-[#0000cd]">
                                        {formatCurrency(item.selling_price)}
                                      </td>
                                    </tr>
                                  ))}
                                  
                                  {/* Group Subtotal Row */}
                                  {group.line_items.length > 1 && (
                                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                                      <td colSpan={4} className="py-3 px-10 text-right font-semibold text-gray-700">
                                        {group.name} Subtotal:
                                      </td>
                                      <td className="py-3 px-6 text-right font-bold text-[#0000cd]">
                                        {formatCurrency(group.total_selling_price)}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Grand Total */}
              <div className="bg-gradient-to-r from-[#0000cd] to-blue-600 text-white px-6 py-4">
                <div className="flex justify-between items-center">
                  <div className="text-lg font-semibold">Total Investment</div>
                  <div className="text-3xl font-bold">
                    {formatCurrency(quote.total_selling_price)}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Value Proposition */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0000cd] mb-6">Why Choose Heat Pumps Now?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-[#0000cd]">
              <div className="text-3xl mb-4">🏆</div>
              <h3 className="font-bold text-lg mb-2">Industry Leading Warranty</h3>
              <p className="text-gray-600">10-year parts warranty with comprehensive labor coverage</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-[#e75e00]">
              <div className="text-3xl mb-4">👨‍🔧</div>
              <h3 className="font-bold text-lg mb-2">Certified Professionals</h3>
              <p className="text-gray-600">Factory-trained technicians with 15+ years experience</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border-t-4 border-[#0000cd]">
              <div className="text-3xl mb-4">⭐</div>
              <h3 className="font-bold text-lg mb-2">5-Star Service</h3>
              <p className="text-gray-600">Over 500 satisfied customers with perfect ratings</p>
            </div>
          </div>
        </section>

        {/* Financing Options */}
        <section className="mb-12 bg-gradient-to-r from-[#0000cd] to-[#e75e00] rounded-2xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-6">Flexible Financing Available</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-lg mb-4">
                Make your energy upgrade affordable with our financing options:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <span className="text-2xl mr-3">✓</span>
                  <span>0% APR for 12 months on approved credit</span>
                </li>
                <li className="flex items-center">
                  <span className="text-2xl mr-3">✓</span>
                  <span>Low monthly payments starting at $89/month</span>
                </li>
                <li className="flex items-center">
                  <span className="text-2xl mr-3">✓</span>
                  <span>No prepayment penalties</span>
                </li>
              </ul>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold mb-3">Example Monthly Payment</h3>
              <div className="text-3xl font-bold mb-2">
                {formatCurrency(Math.round(quote.total_selling_price / 60))}
                <span className="text-lg font-normal">/month</span>
              </div>
              <p className="text-sm text-white/80">60 months at 4.99% APR</p>
            </div>
          </div>
        </section>

        {/* Terms & Conditions */}
        {quote.terms_content && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#0000cd] mb-6">Terms & Conditions</h2>
            <div className="bg-gray-50 rounded-xl p-6">
              <p className="text-gray-700">{quote.terms_content}</p>
            </div>
          </section>
        )}

        {/* Notes */}
        {quote.notes && quote.notes.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-[#0000cd] mb-6">Additional Information</h2>
            <div className="space-y-4">
              {quote.notes.map((note: any, index: number) => (
                <div key={index} className="bg-white rounded-lg p-6 shadow border-l-4 border-[#e75e00]">
                  <h3 className="font-bold text-lg mb-2">{note.subject}</h3>
                  <p className="text-gray-700">{note.text}</p>
                  <p className="text-sm text-gray-500 mt-3">— {note.agent_name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Call to Action */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-2xl p-12 text-center border-2 border-[#0000cd]">
            <h2 className="text-3xl font-bold text-[#0000cd] mb-4">
              Ready to Transform Your Home Comfort?
            </h2>
            <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
              Join hundreds of satisfied homeowners who have made the switch to efficient, 
              reliable heat pump technology. Your comfort upgrade is just one call away.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="tel:1-800-HEAT-NOW"
                className="inline-flex items-center justify-center px-8 py-4 bg-[#e75e00] text-white rounded-lg text-lg font-bold hover:bg-orange-600 transition shadow-lg"
              >
                <span className="mr-3">📞</span>
                Call 1-800-HEAT-NOW
              </a>
              <button 
                onClick={() => window.location.href = `mailto:info@heatpumpsnow.com?subject=Quote ${quote.quote_number} - Ready to Proceed`}
                className="inline-flex items-center justify-center px-8 py-4 bg-[#0000cd] text-white rounded-lg text-lg font-bold hover:bg-blue-700 transition shadow-lg"
              >
                <span className="mr-3">✉️</span>
                Accept Quote via Email
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mt-6">
              This quote is valid until <strong>{formatDate(quote.valid_until)}</strong>
            </p>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="border-t pt-8">
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#0000cd]">EPA</div>
              <div className="text-xs text-gray-600">Certified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#0000cd]">ENERGY STAR</div>
              <div className="text-xs text-gray-600">Partner</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#0000cd]">BBB</div>
              <div className="text-xs text-gray-600">A+ Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#0000cd]">AHRI</div>
              <div className="text-xs text-gray-600">Certified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#0000cd]">NATE</div>
              <div className="text-xs text-gray-600">Certified Techs</div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <img 
                src="/logo-white.svg" 
                alt="Heat Pumps Now" 
                className="h-10 mb-4"
              />
              <p className="text-gray-400">
                Your trusted partner for energy-efficient heating and cooling solutions.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-3">Contact Us</h3>
              <p className="text-gray-400">
                📞 1-800-HEAT-NOW<br />
                ✉️ info@heatpumpsnow.com<br />
                🌐 www.heatpumpsnow.com
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-3">Business Hours</h3>
              <p className="text-gray-400">
                Monday - Friday: 7:00 AM - 8:00 PM<br />
                Saturday: 8:00 AM - 6:00 PM<br />
                Sunday: Emergency Service Only
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>© {new Date().getFullYear()} Heat Pumps Now. All rights reserved. | License #HVAC123456</p>
          </div>
        </div>
      </footer>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          header button,
          .no-print {
            display: none !important;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .bg-gradient-to-br,
          .bg-gradient-to-r {
            background: #0000cd !important;
          }
        }
      `}</style>
    </div>
  );
}