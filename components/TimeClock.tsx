// Simple TimeClock component for Heat Pumps Now employee portal
'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, RotateCcw } from 'lucide-react';

interface TimeEntry {
  id: string;
  startTime: string;
  endTime?: string;
  description?: string;
  status: 'active' | 'completed';
}

interface TimeClockProps {
  onTimeEntry?: (entry: TimeEntry) => void;
}

const TimeClock: React.FC<TimeClockProps> = ({ onTimeEntry }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleClockIn = () => {
    const entry: TimeEntry = {
      id: Date.now().toString(),
      startTime: new Date().toISOString(),
      status: 'active'
    };
    
    setActiveEntry(entry);
    setIsClockingIn(true);
    onTimeEntry?.(entry);
  };

  const handleClockOut = () => {
    if (activeEntry) {
      const completedEntry = {
        ...activeEntry,
        endTime: new Date().toISOString(),
        status: 'completed' as const
      };
      
      setRecentEntries(prev => [completedEntry, ...prev.slice(0, 4)]);
      setActiveEntry(null);
      setIsClockingIn(false);
      onTimeEntry?.(completedEntry);
    }
  };

  const getActiveTime = () => {
    if (!activeEntry) return '00:00:00';
    
    const startTime = new Date(activeEntry.startTime);
    const diff = currentTime.getTime() - startTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center mb-2">
          <Clock className="h-8 w-8 text-blue-600 mr-2" />
          <h2 className="text-2xl font-bold text-gray-900">Time Clock</h2>
        </div>
        <div className="text-lg text-gray-600">
          {currentTime.toLocaleTimeString()}
        </div>
        <div className="text-sm text-gray-500">
          {currentTime.toLocaleDateString()}
        </div>
      </div>

      {activeEntry && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="text-center">
            <div className="text-green-800 font-medium mb-2">Currently Clocked In</div>
            <div className="text-2xl font-bold text-green-900 mb-2">
              {getActiveTime()}
            </div>
            <div className="text-sm text-green-700">
              Started at {new Date(activeEntry.startTime).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center space-x-4 mb-6">
        {!isClockingIn ? (
          <button
            onClick={handleClockIn}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Play className="h-5 w-5" />
            <span>Clock In</span>
          </button>
        ) : (
          <button
            onClick={handleClockOut}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex items-center space-x-2"
          >
            <Square className="h-5 w-5" />
            <span>Clock Out</span>
          </button>
        )}
      </div>

      {recentEntries.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Entries</h3>
          <div className="space-y-2">
            {recentEntries.map((entry) => {
              const duration = entry.endTime 
                ? new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()
                : 0;
              const hours = Math.floor(duration / (1000 * 60 * 60));
              const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
              
              return (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(entry.startTime).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(entry.startTime).toLocaleTimeString()} - {' '}
                      {entry.endTime ? new Date(entry.endTime).toLocaleTimeString() : 'In Progress'}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {hours}h {minutes}m
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeClock;