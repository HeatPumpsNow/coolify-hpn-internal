// Placeholder line item selector component
'use client';

import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';

interface LineItem {
  id: string;
  name: string;
  description?: string;
  basePrice: number;
  category: string;
}

interface LineItemSelectorProps {
  onItemSelect?: (item: LineItem) => void;
  selectedItems?: LineItem[];
}

const LineItemSelector: React.FC<LineItemSelectorProps> = ({ 
  onItemSelect, 
  selectedItems = [] 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Sample line items
  const sampleItems: LineItem[] = [
    {
      id: '1',
      name: 'Heat Pump Unit - Standard',
      description: 'Standard residential heat pump unit',
      basePrice: 3500,
      category: 'Equipment'
    },
    {
      id: '2', 
      name: 'Installation Labor',
      description: 'Professional installation service',
      basePrice: 1200,
      category: 'Labor'
    },
    {
      id: '3',
      name: 'Electrical Work',
      description: 'Electrical connections and setup',
      basePrice: 800,
      category: 'Labor'
    }
  ];

  const filteredItems = sampleItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
        <button className="text-blue-600 hover:text-blue-800 text-sm">
          + Add Custom Item
        </button>
      </div>
      
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search line items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {filteredItems.map(item => (
          <div 
            key={item.id} 
            className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
            onClick={() => onItemSelect?.(item)}
          >
            <div className="flex-1">
              <div className="font-medium text-gray-900">{item.name}</div>
              <div className="text-sm text-gray-500">{item.description}</div>
              <div className="text-xs text-blue-600">{item.category}</div>
            </div>
            <div className="text-right">
              <div className="font-medium text-gray-900">
                ${item.basePrice.toLocaleString()}
              </div>
              <button className="text-blue-600 hover:text-blue-800">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {selectedItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Selected Items ({selectedItems.length})</h4>
          <div className="text-sm text-gray-600">
            Total: ${selectedItems.reduce((sum, item) => sum + item.basePrice, 0).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default LineItemSelector;