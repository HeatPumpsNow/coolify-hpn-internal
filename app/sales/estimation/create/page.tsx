'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import SalesPortalHeader from '@/components/SalesPortalHeader';
import MarginCalculatorStyled from '@/components/ai-integrated/MarginCalculatorStyled';
import LineItemSelector from '@/components/estimation/LineItemSelector';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export default function CreateEstimationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const opportunityId = searchParams.get('opportunity_id');
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [opportunity, setOpportunity] = useState<any>(null);
  
  // Estimate form state
  const [projectName, setProjectName] = useState('');
  const [equipmentCost, setEquipmentCost] = useState(5000);
  const [laborCost, setLaborCost] = useState(2000);
  const [materialCost, setMaterialCost] = useState(500);
  const [margin, setMargin] = useState(35);
  const [finalPrice, setFinalPrice] = useState(0);
  const [notes, setNotes] = useState('');
  const [scope, setScope] = useState('');
  const [warrantyTerms, setWarrantyTerms] = useState('10-year parts warranty, 2-year labor warranty');
  const [selectedLineItems, setSelectedLineItems] = useState<any[]>([]);
  const [useLineItems, setUseLineItems] = useState(true);
  
  // Calculate costs from line items if using them
  const calculateCostsFromLineItems = () => {
    let labor = 0;
    let material = 0;
    selectedLineItems.forEach(item => {
      labor += (item.hours || 0) * (item.labor_rate || 0);
      material += item.material_cost || 0;
    });
    return { labor, material };
  };
  
  const lineItemCosts = useLineItems ? calculateCostsFromLineItems() : { labor: 0, material: 0 };
  const totalCost = useLineItems 
    ? lineItemCosts.labor + lineItemCosts.material 
    : equipmentCost + laborCost + materialCost;

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push('/login');
      return;
    }
    
    if (opportunityId) {
      fetchOpportunity(opportunityId);
    }
  }, [opportunityId, router]);
  
  const fetchOpportunity = async (id: string) => {
    try {
      const response = await fetch(`/api/opportunities/${id}`);
      const result = await response.json();
      
      if (result.success) {
        setOpportunity(result.data);
        setProjectName(`${result.data.customer_name} - HVAC Installation`);
      }
    } catch (error) {
      console.error('Error fetching opportunity:', error);
    }
  };
  
  const handleCreateEstimate = async () => {
    if (!opportunityId) {
      alert('No opportunity selected');
      return;
    }
    
    setLoading(true);
    
    try {
      // First create the estimate
      const estimateData = {
        opportunity_id: opportunityId,
        customer_id: opportunity?.customer_id || `cust-${Date.now()}`,
        project_name: projectName,
        total_equipment_cost: useLineItems ? 0 : equipmentCost,
        total_labor_cost: useLineItems ? lineItemCosts.labor : laborCost,
        total_material_cost: useLineItems ? lineItemCosts.material : materialCost,
        total_cost: totalCost,
        margin_percentage: margin,
        final_price: finalPrice,
        project_scope: scope,
        installation_notes: notes,
        warranty_terms: warrantyTerms,
        equipment_details: useLineItems ? null : {
          system: "Heat Pump System",
          tonnage: "3.5 ton",
          seer: "20",
          hspf: "10"
        },
        labor_details: useLineItems ? {
          hours: selectedLineItems.reduce((sum, item) => sum + (item.hours || 0), 0),
          technicians: 2,
          tasks: ["Installation", "Testing", "Commissioning"]
        } : {
          hours: Math.round(laborCost / 125), // Assuming $125/hour
          technicians: 2,
          tasks: ["Installation", "Testing", "Commissioning"]
        },
        material_details: useLineItems ? {
          items: selectedLineItems.filter(item => item.material_cost > 0).map(item => item.name)
        } : {
          items: ["Refrigerant lines", "Electrical components", "Mounting hardware"]
        }
      };
      
      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(estimateData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // If using line items, add them to the estimate
        if (useLineItems && selectedLineItems.length > 0) {
          const lineItemsResponse = await fetch('/api/line-items', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              estimate_id: result.data.id,
              line_items: selectedLineItems
            }),
          });
          
          if (!lineItemsResponse.ok) {
            console.error('Failed to add line items to estimate');
          }
        }
        
        alert('Estimate created successfully!');
        router.push(`/estimation/${result.data.id}`);
      } else {
        alert('Failed to create estimate: ' + (result.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error creating estimate:', error);
      alert('Failed to create estimate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <SalesPortalHeader user={user} />}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create New Estimate</h1>
              {opportunity && (
                <p className="text-gray-600 mt-1">
                  For: {opportunity.customer_name} • {opportunity.lead_number}
                </p>
              )}
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Form Inputs */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Name
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Smith Residence - Heat Pump Installation"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Scope
                    </label>
                    <textarea
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Describe the work to be performed..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Cost Breakdown</CardTitle>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Use Line Items:</label>
                      <input
                        type="checkbox"
                        checked={useLineItems}
                        onChange={(e) => setUseLineItems(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">{useLineItems ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Costs are calculated from selected line items below.
                    </p>
                    <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">Labor Cost:</span>
                        <span className="font-medium">${lineItemCosts.labor.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-700">Material Cost:</span>
                        <span className="font-medium">${lineItemCosts.material.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-medium text-gray-900">Total Cost:</span>
                        <span className="text-lg font-bold text-gray-900">${totalCost.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Equipment Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={equipmentCost}
                        onChange={(e) => setEquipmentCost(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Labor Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={laborCost}
                        onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={materialCost}
                        onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-900">Total Cost:</span>
                      <span className="text-xl font-bold text-gray-900">
                        ${totalCost.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  </>
                )}
                </CardContent>
              </Card>

              {useLineItems && (
                <LineItemSelector 
                  onSelectionChange={setSelectedLineItems}
                  selectedItems={selectedLineItems}
                />
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Installation Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Special requirements, access notes, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Warranty Terms
                    </label>
                    <input
                      type="text"
                      value={warrantyTerms}
                      onChange={(e) => setWarrantyTerms(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Margin Calculator */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Margin Calculator</CardTitle>
                  <p className="text-sm text-gray-600">
                    Adjust the margin to see real-time pricing
                  </p>
                </CardHeader>
                <CardContent>
                  <MarginCalculatorStyled
                    cost={totalCost}
                    initialMargin={margin}
                    onMarginChange={(newMargin, newPrice) => {
                      setMargin(newMargin);
                      setFinalPrice(newPrice);
                    }}
                    suggestedMargins={[
                      { label: 'Minimum (25%)', value: 25 },
                      { label: 'Standard (35%)', value: 35 },
                      { label: 'Premium (45%)', value: 45 },
                      { label: 'Luxury (55%)', value: 55 }
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Cost:</span>
                      <span className="font-medium">${totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Margin ({margin}%):</span>
                      <span className="font-medium text-green-600">
                        ${(finalPrice - totalCost).toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between">
                        <span className="text-lg font-medium">Final Price:</span>
                        <span className="text-2xl font-bold text-blue-600">
                          ${finalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-4 space-y-2">
                    <Button
                      onClick={handleCreateEstimate}
                      disabled={loading || !projectName || totalCost === 0}
                      className="w-full"
                    >
                      {loading ? 'Creating...' : 'Create Estimate'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.back()}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}