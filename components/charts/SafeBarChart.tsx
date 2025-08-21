// Safe bar chart component for Heat Pumps Now portal system
'use client';

import React from 'react';

interface SafeBarChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  height?: number;
  color?: string;
}

const SafeBarChart: React.FC<SafeBarChartProps> = ({ 
  data, 
  xKey, 
  yKey, 
  height = 200,
  color = '#3b82f6'
}) => {
  const maxValue = Math.max(...data.map(item => item[yKey] || 0));

  return (
    <div className="space-y-3" style={{ height }}>
      {data.map((item, index) => {
        const value = item[yKey] || 0;
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        
        return (
          <div key={index} className="flex items-center space-x-3">
            <div className="text-sm font-medium text-gray-700 w-20 truncate">
              {item[xKey]}
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div
                className="h-4 rounded-full transition-all duration-300"
                style={{ 
                  width: `${percentage}%`,
                  backgroundColor: color
                }}
              />
            </div>
            <div className="text-sm font-medium text-gray-700 w-12 text-right">
              {value}
            </div>
          </div>
        );
      })}
      {data.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-500">
          No data available
        </div>
      )}
    </div>
  );
};

export default SafeBarChart;