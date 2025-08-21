// Simple chart components for Heat Pumps Now portal system
// TODO: Replace with proper charting library when needed

import React from 'react';

interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  height?: number;
  colors?: string[];
}

export const PieChart: React.FC<PieChartProps> = ({ 
  data, 
  height = 200, 
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'] 
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">{total}</div>
        <div className="text-sm text-gray-500">Total Items</div>
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface BarChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  bars: Array<{ key: string; name: string; color: string }>;
  height?: number;
  layout?: 'horizontal' | 'vertical';
}

export const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  xKey, 
  bars, 
  height = 200,
  layout = 'vertical'
}) => {
  const maxValue = Math.max(
    ...data.flatMap(item => bars.map(bar => item[bar.key] || 0))
  );

  return (
    <div className="space-y-4" style={{ height }}>
      {data.map((item, index) => (
        <div key={index} className="space-y-2">
          <div className="text-sm font-medium text-gray-700">
            {item[xKey]}
          </div>
          <div className="space-y-1">
            {bars.map(bar => {
              const value = item[bar.key] || 0;
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
              
              return (
                <div key={bar.key} className="flex items-center space-x-2">
                  <div className="text-xs text-gray-500 w-16">
                    {bar.name}
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: bar.color
                      }}
                    />
                  </div>
                  <div className="text-xs font-medium text-gray-700 w-8">
                    {value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

// Simple line chart placeholder
interface LineChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({ 
  data, 
  xKey, 
  yKey, 
  height = 200 
}) => {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="text-center">
        <div className="text-gray-500">Line Chart</div>
        <div className="text-sm text-gray-400">
          {data.length} data points
        </div>
      </div>
    </div>
  );
};

// Simple area chart placeholder
interface AreaChartProps {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  height?: number;
}

export const AreaChart: React.FC<AreaChartProps> = ({ 
  data, 
  xKey, 
  yKey, 
  height = 200 
}) => {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="text-center">
        <div className="text-gray-500">Area Chart</div>
        <div className="text-sm text-gray-400">
          {data.length} data points
        </div>
      </div>
    </div>
  );
};

export default { PieChart, BarChart, LineChart, AreaChart };