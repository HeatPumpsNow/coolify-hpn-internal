'use client';

import { useState } from 'react';
import { 
  Shield, 
  Download, 
  AlertTriangle, 
  RefreshCw, 
  Trash2,
  Power,
  CheckCircle
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  variant: 'primary' | 'secondary' | 'danger' | 'warning';
  action: () => Promise<void> | void;
  requiresConfirm?: boolean;
  confirmMessage?: string;
}

interface QuickActionsProps {
  actions?: QuickAction[];
}

export default function QuickActions({ actions }: QuickActionsProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});

  const defaultActions: QuickAction[] = [
    {
      id: 'clear-rate-limits',
      label: 'Clear Rate Limits',
      description: 'Remove all active rate limits',
      icon: <Shield className="h-4 w-4" />,
      variant: 'primary',
      action: async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Rate limits cleared');
      }
    },
    {
      id: 'export-audit-log',
      label: 'Export Audit Log',
      description: 'Download recent security events',
      icon: <Download className="h-4 w-4" />,
      variant: 'secondary',
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        // Create mock CSV data
        const csvData = `timestamp,event_type,user_email,ip_address,status
${new Date().toISOString()},login_success,user@example.com,192.168.1.1,success
${new Date(Date.now() - 300000).toISOString()},login_failure,unknown@example.com,203.0.113.1,failure`;
        
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    },
    {
      id: 'refresh-cache',
      label: 'Refresh Cache',
      description: 'Clear and refresh system cache',
      icon: <RefreshCw className="h-4 w-4" />,
      variant: 'secondary',
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 800));
        console.log('Cache refreshed');
      }
    },
    {
      id: 'cleanup-sessions',
      label: 'Cleanup Old Sessions',
      description: 'Remove expired sessions',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'warning',
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 1200));
        console.log('Old sessions cleaned up');
      },
      requiresConfirm: true,
      confirmMessage: 'This will remove all expired sessions. Continue?'
    },
    {
      id: 'emergency-logout',
      label: 'Emergency Logout All',
      description: 'Immediately log out all users',
      icon: <Power className="h-4 w-4" />,
      variant: 'danger',
      action: async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('Emergency logout initiated');
      },
      requiresConfirm: true,
      confirmMessage: 'This will immediately log out ALL users from all portals. This action cannot be undone. Continue?'
    }
  ];

  const displayActions = actions || defaultActions;

  const getVariantClasses = (variant: string) => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-500 hover:bg-blue-600 text-white border-blue-500';
      case 'secondary':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500';
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white border-red-500';
      default:
        return 'bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-300';
    }
  };

  const handleAction = async (actionItem: QuickAction) => {
    if (actionItem.requiresConfirm) {
      const confirmed = window.confirm(actionItem.confirmMessage || 'Are you sure?');
      if (!confirmed) return;
    }

    setLoading(prev => ({ ...prev, [actionItem.id]: true }));
    setSuccess(prev => ({ ...prev, [actionItem.id]: false }));

    try {
      await actionItem.action();
      setSuccess(prev => ({ ...prev, [actionItem.id]: true }));
      
      // Clear success state after 3 seconds
      setTimeout(() => {
        setSuccess(prev => ({ ...prev, [actionItem.id]: false }));
      }, 3000);
    } catch (error) {
      console.error(`Action ${actionItem.id} failed:`, error);
      alert(`Action failed: ${error}`);
    } finally {
      setLoading(prev => ({ ...prev, [actionItem.id]: false }));
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Quick Actions</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayActions.map((actionItem) => (
          <button
            key={actionItem.id}
            onClick={() => handleAction(actionItem)}
            disabled={loading[actionItem.id]}
            className={`
              p-4 rounded-lg border transition-all duration-200 text-left
              ${getVariantClasses(actionItem.variant)}
              ${loading[actionItem.id] ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
              ${success[actionItem.id] ? 'ring-2 ring-green-500' : ''}
            `}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {loading[actionItem.id] ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : success[actionItem.id] ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  actionItem.icon
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="font-medium">{actionItem.label}</div>
                <div className="text-sm opacity-75 mt-1">
                  {actionItem.description}
                </div>
                
                {success[actionItem.id] && (
                  <div className="text-xs text-green-600 mt-1 font-medium">
                    Completed successfully
                  </div>
                )}
                
                {loading[actionItem.id] && (
                  <div className="text-xs opacity-75 mt-1">
                    Processing...
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {displayActions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No quick actions available</p>
        </div>
      )}
    </div>
  );
}