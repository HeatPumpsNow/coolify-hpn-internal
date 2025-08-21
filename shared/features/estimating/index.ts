/**
 * Cross-Portal Estimating Feature
 * Used in: Sales Portal (full), Service Portal (view/suggest), Owner Portal (approve/analytics)
 */

import { db } from '@heat-pumps-now/database';
import { authService } from '@heat-pumps-now/auth';

export interface EstimateItem {
  id: string;
  category: 'equipment' | 'labor' | 'materials' | 'permits' | 'other';
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  margin: number;
  taxable: boolean;
  metadata?: Record<string, any>;
}

export interface Estimate {
  id: string;
  portalType: string;
  createdBy: string;
  customerId?: string;
  jobId?: string;
  serviceRequestId?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'sent' | 'accepted';
  items: EstimateItem[];
  subtotal: number;
  tax: number;
  total: number;
  margin: number;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EstimatingConfig {
  portal: 'sales' | 'service' | 'owner' | 'employee';
  permissions: EstimatingPermission[];
  components?: EstimatingComponent[];
  settings?: EstimatingSettings;
}

export type EstimatingPermission = 
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'send'
  | 'export'
  | 'import'
  | 'view-margin'
  | 'edit-margin'
  | 'view-analytics'
  | 'manage-templates';

export type EstimatingComponent = 
  | 'full-editor'
  | 'quick-add'
  | 'viewer'
  | 'pricing-engine'
  | 'approval-workflow'
  | 'analytics-dashboard'
  | 'template-manager'
  | 'item-catalog';

export interface EstimatingSettings {
  defaultMargin?: number;
  taxRate?: number;
  requireApproval?: boolean;
  approvalThreshold?: number;
  allowCustomItems?: boolean;
  enableTemplates?: boolean;
  autoSave?: boolean;
}

export class EstimatingFeature {
  private config: EstimatingConfig;
  
  constructor(config: EstimatingConfig) {
    this.config = config;
  }

  /**
   * Configure the feature for a specific portal
   */
  static configure(config: EstimatingConfig): EstimatingFeature {
    return new EstimatingFeature(config);
  }

  /**
   * Check if user has permission
   */
  hasPermission(permission: EstimatingPermission, user?: any): boolean {
    if (!this.config.permissions.includes(permission)) {
      return false;
    }

    // Additional user-level permission checks
    if (user) {
      return authService.hasPermission(user, `estimating.${permission}`);
    }

    return true;
  }

  /**
   * Create a new estimate
   */
  async createEstimate(data: Partial<Estimate>, userId: string): Promise<Estimate> {
    if (!this.hasPermission('create')) {
      throw new Error('Permission denied: Cannot create estimates');
    }

    const estimate = await db.insert('estimates', {
      portal_type: this.config.portal,
      created_by: userId,
      status: 'draft',
      items: JSON.stringify(data.items || []),
      subtotal: data.subtotal || 0,
      tax: data.tax || 0,
      total: data.total || 0,
      margin: data.margin || this.config.settings?.defaultMargin || 0,
      customer_id: data.customerId,
      job_id: data.jobId,
      service_request_id: data.serviceRequestId,
      notes: data.notes
    });

    return this.formatEstimate(estimate);
  }

  /**
   * Update an existing estimate
   */
  async updateEstimate(id: string, updates: Partial<Estimate>, userId: string): Promise<Estimate> {
    if (!this.hasPermission('edit')) {
      throw new Error('Permission denied: Cannot edit estimates');
    }

    // Check if approval is needed
    if (this.config.settings?.requireApproval && updates.total) {
      const threshold = this.config.settings.approvalThreshold || 0;
      if (updates.total > threshold) {
        updates.status = 'pending';
      }
    }

    const estimate = await db.update('estimates', {
      ...updates,
      items: updates.items ? JSON.stringify(updates.items) : undefined,
      updated_at: new Date()
    }, { id });

    return this.formatEstimate(estimate[0]);
  }

  /**
   * Get estimates based on portal permissions
   */
  async getEstimates(filters?: any): Promise<Estimate[]> {
    if (!this.hasPermission('view')) {
      throw new Error('Permission denied: Cannot view estimates');
    }

    let query = 'SELECT * FROM estimates WHERE 1=1';
    const params: any[] = [];

    // Portal-specific filtering
    if (this.config.portal === 'sales') {
      // Sales can see all estimates
    } else if (this.config.portal === 'service') {
      // Service can only see service-related estimates
      query += ' AND (portal_type = $1 OR service_request_id IS NOT NULL)';
      params.push('service');
    } else if (this.config.portal === 'owner') {
      // Owner can see all approved estimates
      query += ' AND status IN ($1, $2, $3)';
      params.push('approved', 'sent', 'accepted');
    }

    // Apply additional filters
    if (filters?.customerId) {
      query += ` AND customer_id = $${params.length + 1}`;
      params.push(filters.customerId);
    }

    if (filters?.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    const estimates = await db.queryMany(query, params);
    return estimates.map(e => this.formatEstimate(e));
  }

  /**
   * Approve an estimate
   */
  async approveEstimate(id: string, approverId: string): Promise<Estimate> {
    if (!this.hasPermission('approve')) {
      throw new Error('Permission denied: Cannot approve estimates');
    }

    const estimate = await db.update('estimates', {
      status: 'approved',
      approved_by: approverId,
      approved_at: new Date()
    }, { id });

    // Log approval event
    await db.insert('estimate_events', {
      estimate_id: id,
      event_type: 'approved',
      user_id: approverId,
      portal_type: this.config.portal
    });

    return this.formatEstimate(estimate[0]);
  }

  /**
   * Calculate pricing with margin
   */
  calculatePricing(items: EstimateItem[]): {
    subtotal: number;
    margin: number;
    tax: number;
    total: number;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const defaultMargin = this.config.settings?.defaultMargin || 0;
    const margin = subtotal * (defaultMargin / 100);
    const taxableAmount = items
      .filter(item => item.taxable)
      .reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = this.config.settings?.taxRate || 0;
    const tax = (taxableAmount + margin) * (taxRate / 100);
    const total = subtotal + margin + tax;

    return { subtotal, margin, tax, total };
  }

  /**
   * Get available components for the portal
   */
  getComponents(): EstimatingComponent[] {
    return this.config.components || [];
  }

  /**
   * Get analytics data (owner portal feature)
   */
  async getAnalytics(dateRange?: { start: Date; end: Date }): Promise<any> {
    if (!this.hasPermission('view-analytics')) {
      throw new Error('Permission denied: Cannot view analytics');
    }

    const query = `
      SELECT 
        COUNT(*) as total_estimates,
        SUM(total) as total_value,
        AVG(margin) as avg_margin,
        COUNT(CASE WHEN status = 'accepted' END) as accepted_count,
        SUM(CASE WHEN status = 'accepted' THEN total END) as accepted_value
      FROM estimates
      WHERE created_at BETWEEN $1 AND $2
    `;

    const start = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = dateRange?.end || new Date();

    const analytics = await db.queryOne(query, [start, end]);
    return analytics;
  }

  /**
   * Format estimate from database
   */
  private formatEstimate(dbEstimate: any): Estimate {
    return {
      id: dbEstimate.id,
      portalType: dbEstimate.portal_type,
      createdBy: dbEstimate.created_by,
      customerId: dbEstimate.customer_id,
      jobId: dbEstimate.job_id,
      serviceRequestId: dbEstimate.service_request_id,
      status: dbEstimate.status,
      items: typeof dbEstimate.items === 'string' ? JSON.parse(dbEstimate.items) : dbEstimate.items,
      subtotal: parseFloat(dbEstimate.subtotal),
      tax: parseFloat(dbEstimate.tax),
      total: parseFloat(dbEstimate.total),
      margin: parseFloat(dbEstimate.margin),
      notes: dbEstimate.notes,
      approvedBy: dbEstimate.approved_by,
      approvedAt: dbEstimate.approved_at,
      createdAt: dbEstimate.created_at,
      updatedAt: dbEstimate.updated_at
    };
  }
}

// Export pre-configured instances for each portal
export const salesEstimating = EstimatingFeature.configure({
  portal: 'sales',
  permissions: ['view', 'create', 'edit', 'delete', 'send', 'export', 'import', 'view-margin', 'edit-margin', 'manage-templates'],
  components: ['full-editor', 'pricing-engine', 'template-manager', 'item-catalog'],
  settings: {
    defaultMargin: 35,
    taxRate: 8.25,
    requireApproval: true,
    approvalThreshold: 10000,
    allowCustomItems: true,
    enableTemplates: true,
    autoSave: true
  }
});

export const serviceEstimating = EstimatingFeature.configure({
  portal: 'service',
  permissions: ['view', 'create', 'edit'],
  components: ['viewer', 'quick-add'],
  settings: {
    defaultMargin: 25,
    taxRate: 8.25,
    requireApproval: true,
    approvalThreshold: 5000,
    allowCustomItems: false,
    autoSave: true
  }
});

export const ownerEstimating = EstimatingFeature.configure({
  portal: 'owner',
  permissions: ['view', 'approve', 'reject', 'export', 'view-margin', 'view-analytics'],
  components: ['viewer', 'approval-workflow', 'analytics-dashboard'],
  settings: {
    requireApproval: false
  }
});