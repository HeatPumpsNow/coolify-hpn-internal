import React, { useState, useEffect } from 'react';
import { Button, Input, Card, Alert } from '@heat-pumps-now/ui';
import { EstimatingFeature, EstimateItem, Estimate } from '../index';

interface EstimateEditorProps {
  feature: EstimatingFeature;
  estimate?: Estimate;
  onSave: (estimate: Estimate) => void;
  onCancel: () => void;
  mode?: 'create' | 'edit' | 'view';
}

export const EstimateEditor: React.FC<EstimateEditorProps> = ({
  feature,
  estimate,
  onSave,
  onCancel,
  mode = 'create'
}) => {
  const [items, setItems] = useState<EstimateItem[]>(estimate?.items || []);
  const [notes, setNotes] = useState(estimate?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check what components are available for this portal
  const components = feature.getComponents();
  const canEdit = mode !== 'view' && (
    components.includes('full-editor') || 
    components.includes('quick-add')
  );
  const showPricing = components.includes('pricing-engine');
  const showMargin = feature.hasPermission('view-margin');

  const addItem = () => {
    const newItem: EstimateItem = {
      id: `item-${Date.now()}`,
      category: 'equipment',
      name: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      margin: 0,
      taxable: true
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, updates: Partial<EstimateItem>) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      ...updates,
      totalPrice: (updates.quantity || newItems[index].quantity) * 
                  (updates.unitPrice || newItems[index].unitPrice)
    };
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    return feature.calculatePricing(items);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const totals = calculateTotals();
      const estimateData: Partial<Estimate> = {
        items,
        notes,
        ...totals
      };

      if (estimate?.id && mode === 'edit') {
        const updated = await feature.updateEstimate(
          estimate.id,
          estimateData,
          'current-user-id' // Would come from auth context
        );
        onSave(updated);
      } else {
        const created = await feature.createEstimate(
          estimateData,
          'current-user-id' // Would come from auth context
        );
        onSave(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save estimate');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Line Items */}
      <Card header={<h3 className="text-lg font-semibold">Line Items</h3>}>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id} className="grid grid-cols-12 gap-4 items-center">
              <div className="col-span-3">
                <Input
                  label="Item Name"
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="col-span-2">
                <select
                  className="w-full p-2 border rounded"
                  value={item.category}
                  onChange={(e) => updateItem(index, { category: e.target.value as any })}
                  disabled={!canEdit}
                >
                  <option value="equipment">Equipment</option>
                  <option value="labor">Labor</option>
                  <option value="materials">Materials</option>
                  <option value="permits">Permits</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-span-2">
                <Input
                  label="Quantity"
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Unit Price"
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, { unitPrice: parseFloat(e.target.value) })}
                  disabled={!canEdit}
                />
              </div>
              <div className="col-span-2">
                <div className="text-right font-semibold">
                  ${item.totalPrice.toFixed(2)}
                </div>
              </div>
              {canEdit && (
                <div className="col-span-1">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
          
          {canEdit && (
            <Button variant="secondary" onClick={addItem}>
              Add Line Item
            </Button>
          )}
        </div>
      </Card>

      {/* Pricing Summary */}
      {showPricing && (
        <Card header={<h3 className="text-lg font-semibold">Pricing Summary</h3>}>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold">${totals.subtotal.toFixed(2)}</span>
            </div>
            {showMargin && (
              <div className="flex justify-between">
                <span>Margin:</span>
                <span className="font-semibold">${totals.margin.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax:</span>
              <span className="font-semibold">${totals.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Notes */}
      <Card header={<h3 className="text-lg font-semibold">Notes</h3>}>
        <textarea
          className="w-full p-2 border rounded"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!canEdit}
          placeholder="Add any additional notes..."
        />
      </Card>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        {canEdit && (
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={loading}
          >
            {mode === 'edit' ? 'Update Estimate' : 'Create Estimate'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EstimateEditor;