// AI Assistant utilities for Heat Pumps Now sales portal
import React from 'react';

export interface QuoteRequest {
  customerInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  projectDetails: {
    property_type: string;
    square_footage: number;
    existing_system: string;
    installation_urgency: string;
  };
  requirements: string[];
}

export interface AIQuoteResponse {
  estimatedPrice: number;
  breakdown: Array<{
    item: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  recommendations: string[];
  confidence: number;
}

export const AIQuoteAssistant: React.FC<{ onQuoteGenerated?: (quote: AIQuoteResponse) => void }> = ({ 
  onQuoteGenerated 
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const generateQuote = async (request: QuoteRequest): Promise<AIQuoteResponse> => {
    setIsGenerating(true);
    
    // Placeholder AI quote generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockQuote: AIQuoteResponse = {
      estimatedPrice: 12500,
      breakdown: [
        { item: 'Heat Pump Unit', quantity: 1, unitPrice: 8000, total: 8000 },
        { item: 'Installation Labor', quantity: 16, unitPrice: 125, total: 2000 },
        { item: 'Electrical Work', quantity: 1, unitPrice: 1500, total: 1500 },
        { item: 'Materials & Permits', quantity: 1, unitPrice: 1000, total: 1000 }
      ],
      recommendations: [
        'Consider upgrading electrical panel for optimal performance',
        'Schedule installation during off-peak season for better rates',
        'Add smart thermostat for enhanced efficiency'
      ],
      confidence: 0.85
    };

    setIsGenerating(false);
    onQuoteGenerated?.(mockQuote);
    return mockQuote;
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">AI</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Quote Assistant</h3>
          <p className="text-sm text-gray-500">Generate intelligent quotes based on customer requirements</p>
        </div>
      </div>

      {isGenerating ? (
        <div className="flex items-center space-x-3 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm">Analyzing requirements and generating quote...</span>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">
            AI quote generation will be available soon
          </p>
        </div>
      )}
    </div>
  );
};

export default AIQuoteAssistant;