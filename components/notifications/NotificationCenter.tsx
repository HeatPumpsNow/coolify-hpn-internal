// Simple notification center component
'use client';

import React from 'react';
import { Bell } from 'lucide-react';

interface NotificationCenterProps {
  notifications?: Array<{
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: string;
  }>;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications = [] }) => {
  return (
    <div className="relative">
      <button className="p-2 text-gray-600 hover:text-gray-900">
        <Bell className="h-6 w-6" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>
    </div>
  );
};

export default NotificationCenter;