'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface PriceBookItem {
  id: string;
  sku: string;
  manufacturer: string;
  model: string;
  description: string;
  category: string;
  cost: number;
  markup_percentage: number;
  current_price: number;
  labor_hours_standard: number;
  complexity_factor: number;
  transparency_level: string;
  customer_visible_description: string;
  specifications: any;
}

interface Category {
  category: string;
  item_count: number;
  avg_price: number;
  min_price: number;
  max_price: number;
}

export default function PriceBookPage() {
  const [items, setItems] = useState<PriceBookItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTransparency, setShowTransparency] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    fetchCategories();
    fetchItems();
  }, [router]);

  useEffect(() => {
    if (!loading) {
      fetchItems();
    }
  }, [selectedCategory, searchTerm]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/price-book/categories', {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setCategories(data.data.categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchItems = async () => {
    try {
      const params = new URLSearchParams({
        ...(selectedCategory && { category: selectedCategory }),
        ...(searchTerm && { search: searchTerm }),
        limit: '50',
      });

      const response = await fetch(`/api/price-book?${params}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });
      const data = await response.json();
      
      if (data.success) {
        setItems(data.data.items);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const getToken = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      // In a real app, you'd get the token from the login response
      // For now, we'll make the API call without token and handle it in middleware
      return '';
    }
    return '';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      heat_pump: 'bg-blue-100 text-blue-800',
      accessories: 'bg-green-100 text-green-800',
      materials: 'bg-yellow-100 text-yellow-800',
      labor: 'bg-purple-100 text-purple-800',
      permits: 'bg-red-100 text-red-800',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading price book...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Heat Pumps Now</h1>
              <span className="ml-2 text-blue-600 font-medium">Sales Portal</span>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <a href="/dashboard" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </a>
              <a href="/price-book" className="text-blue-600 hover:text-blue-700 px-3 py-2 rounded-md text-sm font-medium">
                Price Book
              </a>
              <a href="/leads" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Leads
              </a>
              <a href="/quotes" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                Quotes
              </a>
            </nav>
            
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Price Book</h2>
            <p className="mt-1 text-gray-600">
              Browse equipment, materials, and services with transparent pricing
            </p>
          </div>

          {/* Controls */}
          <div className="mb-6 flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by description, manufacturer, model, or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input-field"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.category} value={cat.category}>
                    {cat.category.replace('_', ' ').toUpperCase()} ({cat.item_count})
                  </option>
                ))}
              </select>
              
              <Button
                variant={showTransparency ? 'primary' : 'outline'}
                onClick={() => setShowTransparency(!showTransparency)}
                size="sm"
              >
                {showTransparency ? 'Hide' : 'Show'} Costs
              </Button>
            </div>
          </div>

          {/* Categories Overview */}
          {!selectedCategory && !searchTerm && (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Categories</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {categories.map((category) => (
                  <Card
                    key={category.category}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedCategory(category.category)}
                  >
                    <CardContent className="p-4">
                      <div className="text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(category.category)}`}>
                          {category.category.replace('_', ' ').toUpperCase()}
                        </span>
                        <p className="mt-2 text-2xl font-bold text-gray-900">{category.item_count}</p>
                        <p className="text-sm text-gray-500">items</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatCurrency(category.avg_price)} avg
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="space-y-4">
            {items.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No items found matching your criteria.</p>
                </CardContent>
              </Card>
            ) : (
              items.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(item.category)}`}>
                            {item.category.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">SKU: {item.sku}</span>
                        </div>
                        
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {item.manufacturer} {item.model}
                        </h3>
                        
                        <p className="text-gray-600 mb-3">
                          {item.customer_visible_description || item.description}
                        </p>
                        
                        {item.labor_hours_standard > 0 && (
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>⏱️ {item.labor_hours_standard} hours standard labor</span>
                            <span>🔧 {item.complexity_factor}x complexity factor</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right ml-6">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {formatCurrency(item.current_price)}
                        </div>
                        
                        {showTransparency && (
                          <div className="text-sm text-gray-500">
                            <div>Cost: {formatCurrency(item.cost)}</div>
                            <div>Markup: {item.markup_percentage}%</div>
                          </div>
                        )}
                        
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline">
                            Add to Quote
                          </Button>
                          <Button size="sm" variant="outline">
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}