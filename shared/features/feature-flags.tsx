/**
 * Feature Flag System
 * Controls feature availability across portals
 */

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage?: number;
  enabledPortals?: string[];
  enabledRoles?: string[];
  enabledUsers?: string[];
  metadata?: Record<string, any>;
}

export class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private userOverrides: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeFlags();
  }

  private initializeFlags() {
    // Define all feature flags
    const flags: FeatureFlag[] = [
      {
        key: 'estimating',
        name: 'Advanced Estimating',
        description: 'Cross-portal estimating system',
        enabled: true,
        enabledPortals: ['sales', 'service', 'owner'],
        enabledRoles: ['sales_rep', 'sales_manager', 'technician', 'owner']
      },
      {
        key: 'ai-assistant',
        name: 'AI Assistant',
        description: 'AI-powered job recommendations',
        enabled: false,
        rolloutPercentage: 10,
        enabledPortals: ['sales', 'service']
      },
      {
        key: 'real-time-messaging',
        name: 'Real-Time Messaging',
        description: 'WebSocket-based messaging',
        enabled: true,
        enabledPortals: ['customer', 'employee', 'owner']
      },
      {
        key: 'advanced-analytics',
        name: 'Advanced Analytics',
        description: 'Enhanced analytics dashboard',
        enabled: true,
        enabledPortals: ['owner', 'sales'],
        enabledRoles: ['owner', 'sales_manager']
      },
      {
        key: 'mobile-app',
        name: 'Mobile App Access',
        description: 'Progressive web app features',
        enabled: true,
        enabledPortals: ['employee', 'service']
      },
      {
        key: 'inventory-management',
        name: 'Inventory Management',
        description: 'Track parts and equipment',
        enabled: false,
        enabledPortals: ['service', 'owner']
      },
      {
        key: 'customer-portal-v2',
        name: 'Customer Portal V2',
        description: 'Enhanced customer experience',
        enabled: false,
        rolloutPercentage: 25,
        enabledPortals: ['customer']
      },
      {
        key: 'automated-scheduling',
        name: 'Automated Scheduling',
        description: 'AI-powered job scheduling',
        enabled: false,
        enabledPortals: ['service', 'owner']
      },
      {
        key: 'commission-tracking',
        name: 'Commission Tracking',
        description: 'Sales commission calculation',
        enabled: true,
        enabledPortals: ['sales', 'owner'],
        enabledRoles: ['sales_rep', 'sales_manager', 'owner']
      },
      {
        key: 'equipment-warranties',
        name: 'Equipment Warranty Tracking',
        description: 'Track and manage equipment warranties',
        enabled: true,
        enabledPortals: ['service', 'customer', 'owner']
      }
    ];

    flags.forEach(flag => this.flags.set(flag.key, flag));
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(
    featureKey: string,
    context?: {
      portal?: string;
      role?: string;
      userId?: string;
    }
  ): boolean {
    const flag = this.flags.get(featureKey);
    
    if (!flag || !flag.enabled) {
      return false;
    }

    // Check user override
    if (context?.userId) {
      const userFlags = this.userOverrides.get(context.userId);
      if (userFlags?.has(featureKey)) {
        return true;
      }
    }

    // Check portal restrictions
    if (flag.enabledPortals && context?.portal) {
      if (!flag.enabledPortals.includes(context.portal)) {
        return false;
      }
    }

    // Check role restrictions
    if (flag.enabledRoles && context?.role) {
      if (!flag.enabledRoles.includes(context.role)) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      if (context?.userId) {
        // Consistent hash for user ID
        const hash = this.hashUserId(context.userId);
        return hash <= flag.rolloutPercentage;
      }
      return false;
    }

    return true;
  }

  /**
   * Get all enabled features for a context
   */
  getEnabledFeatures(context: {
    portal?: string;
    role?: string;
    userId?: string;
  }): string[] {
    const enabled: string[] = [];
    
    this.flags.forEach((flag, key) => {
      if (this.isEnabled(key, context)) {
        enabled.push(key);
      }
    });

    return enabled;
  }

  /**
   * Get feature configuration
   */
  getFeature(featureKey: string): FeatureFlag | undefined {
    return this.flags.get(featureKey);
  }

  /**
   * Update feature flag (admin only)
   */
  updateFlag(featureKey: string, updates: Partial<FeatureFlag>): void {
    const flag = this.flags.get(featureKey);
    if (flag) {
      this.flags.set(featureKey, { ...flag, ...updates });
    }
  }

  /**
   * Enable feature for specific user
   */
  enableForUser(userId: string, featureKey: string): void {
    if (!this.userOverrides.has(userId)) {
      this.userOverrides.set(userId, new Set());
    }
    this.userOverrides.get(userId)!.add(featureKey);
  }

  /**
   * Get feature availability matrix
   */
  getFeatureMatrix(): Record<string, Record<string, boolean>> {
    const portals = ['employee', 'owner', 'customer', 'sales', 'service', 'project'];
    const matrix: Record<string, Record<string, boolean>> = {};

    this.flags.forEach((flag, key) => {
      matrix[key] = {};
      portals.forEach(portal => {
        matrix[key][portal] = this.isEnabled(key, { portal });
      });
    });

    return matrix;
  }

  /**
   * Hash user ID for consistent rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 100;
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagService();

// React hook for feature flags
export function useFeatureFlag(
  featureKey: string,
  context?: { portal?: string; role?: string; userId?: string }
): boolean {
  return featureFlags.isEnabled(featureKey, context);
}

// HOC for feature-gated components
export function withFeatureFlag(
  featureKey: string,
  FallbackComponent?: React.ComponentType
) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function FeatureFlaggedComponent(props: P) {
      const isEnabled = useFeatureFlag(featureKey);
      
      if (!isEnabled && FallbackComponent) {
        return <FallbackComponent {...props} />;
      }
      
      if (!isEnabled) {
        return null;
      }

      return <Component {...props} />;
    };
  };
}

export default featureFlags;