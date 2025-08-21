'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SharedAuthContext';
import TimeClock from '@/components/TimeClock';
import { useRouter } from 'next/navigation';

export default function TimeClockPage() {
  const { user: employee, isLoading } = useAuth();
  const router = useRouter();
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(0);

  useEffect(() => {
    // Fetch recent time entries and calculate weekly hours
    fetchTimeData();
  }, [employee]);

  const fetchTimeData = async () => {
    if (!employee) return;
    
    // TODO: Fetch from API
    // For now, use mock data
    const mockEntries = [
      { date: '2024-01-15', clockIn: '08:00', clockOut: '17:00', hours: 9, project: 'HVAC Installation - Smith Residence' },
      { date: '2024-01-14', clockIn: '07:30', clockOut: '16:30', hours: 9, project: 'Heat Pump Maintenance - Johnson' },
      { date: '2024-01-13', clockIn: '08:15', clockOut: '17:45', hours: 9.5, project: 'System Repair - Williams' },
    ];
    
    setTimeEntries(mockEntries);
    setWeeklyHours(mockEntries.reduce((sum, entry) => sum + entry.hours, 0));
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!employee) {
    router.push('/employee/login');
    return <div className="p-4">No session found. Redirecting to login...</div>;
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Time Clock</h1>
        <p className="text-gray-600 mt-2">Track your work hours and manage time entries</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Time Clock Widget - Takes 1 column */}
        <div className="lg:col-span-1">
          <TimeClock />
          
          {/* Quick Stats */}
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">This Week's Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Hours</span>
                <span className="text-xl font-bold text-gray-900">{weeklyHours.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Days Worked</span>
                <span className="text-xl font-bold text-gray-900">{timeEntries.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Hours/Day</span>
                <span className="text-xl font-bold text-gray-900">
                  {timeEntries.length > 0 ? (weeklyHours / timeEntries.length).toFixed(1) : '0'}
                </span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Regular Hours</span>
                <span className="font-medium text-gray-900">{Math.min(40, weeklyHours).toFixed(1)}</span>
              </div>
              {weeklyHours > 40 && (
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-gray-600">Overtime</span>
                  <span className="font-medium text-green-600">+{(weeklyHours - 40).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Time Entries - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Recent Time Entries</h3>
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View All →
                </button>
              </div>
            </div>
            
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hours
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {timeEntries.length > 0 ? (
                    timeEntries.map((entry, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="truncate max-w-xs" title={entry.project}>
                            {entry.project}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {formatTime(entry.clockIn)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {formatTime(entry.clockOut)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                          {entry.hours}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <button className="text-blue-600 hover:text-blue-900">
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No time entries found for this week
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Time Entry Guidelines */}
          <div className="mt-6 bg-blue-50 rounded-lg p-6">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Time Entry Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Clock in when you arrive at the job site</li>
              <li>• Take a 30-minute unpaid lunch break for shifts over 6 hours</li>
              <li>• Clock out when leaving the job site</li>
              <li>• Report any discrepancies to your supervisor immediately</li>
              <li>• Overtime (40+ hours/week) requires manager approval</li>
            </ul>
          </div>

          {/* Mobile Time Entry */}
          <div className="mt-6 bg-gray-50 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-semibold text-gray-900">Mobile Time Tracking</h4>
                <p className="mt-1 text-sm text-gray-600">
                  Use the Heat Pumps Now mobile app to clock in/out directly from job sites with GPS verification.
                </p>
                <button className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Download Mobile App →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}