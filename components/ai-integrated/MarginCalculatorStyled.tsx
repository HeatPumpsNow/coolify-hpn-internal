// Placeholder margin calculator component
'use client';

import React, { useState } from 'react';
import { Calculator } from 'lucide-react';

interface MarginCalculatorStyledProps {
  onMarginChange?: (margin: number) => void;
  initialMargin?: number;
}

const MarginCalculatorStyled: React.FC<MarginCalculatorStyledProps> = ({ 
  onMarginChange, 
  initialMargin = 20 
}) => {
  const [margin, setMargin] = useState(initialMargin);

  const handleMarginChange = (newMargin: number) => {
    setMargin(newMargin);
    onMarginChange?.(newMargin);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center mb-4">
        <Calculator className="h-5 w-5 text-blue-600 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Margin Calculator</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profit Margin (%)
          </label>
          <input
            type="range"
            min="5"
            max="50"
            value={margin}
            onChange={(e) => handleMarginChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>5%</span>
            <span className="font-medium text-blue-600">{margin}%</span>
            <span>50%</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Cost Base:</span>
            <span className="block font-medium">$10,000</span>
          </div>
          <div>
            <span className="text-gray-600">Final Price:</span>
            <span className="block font-medium text-green-600">
              ${(10000 * (1 + margin / 100)).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarginCalculatorStyled;