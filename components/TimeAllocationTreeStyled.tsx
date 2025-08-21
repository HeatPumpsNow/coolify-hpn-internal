import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, Clock, Save, AlertCircle, CheckCircle, User } from 'lucide-react';

interface TimeAllocation {
  id: string;
  name: string;
  hours: number;
  minutes: number;
  children?: TimeAllocation[];
  projectCode?: string;
  taskCode?: string;
}

interface Employee {
  id: string;
  name: string;
  department: string;
}

interface SavedPreference {
  employeeId: string;
  allocations: TimeAllocation[];
  lastUsed: Date;
}

interface TimeAllocationTreeProps {
  employee: Employee;
  preferences?: SavedPreference[];
  onAllocate: (allocations: TimeAllocation[]) => void;
  enforceBeforeClockOut?: boolean;
  totalHoursWorked?: number;
}

const TimeAllocationTreeStyled = ({
  employee,
  preferences = [],
  onAllocate,
  enforceBeforeClockOut = true,
  totalHoursWorked = 8
}: TimeAllocationTreeProps) => {
  const [allocations, setAllocations] = useState<TimeAllocation[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isValid, setIsValid] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const defaultStructure: TimeAllocation[] = [
    {
      id: 'proj-1',
      name: 'Project Work',
      hours: 0,
      minutes: 0,
      children: [
        { id: 'task-1-1', name: 'Development', hours: 0, minutes: 0 },
        { id: 'task-1-2', name: 'Code Review', hours: 0, minutes: 0 },
        { id: 'task-1-3', name: 'Testing', hours: 0, minutes: 0 }
      ]
    },
    {
      id: 'proj-2',
      name: 'Administrative',
      hours: 0,
      minutes: 0,
      children: [
        { id: 'task-2-1', name: 'Meetings', hours: 0, minutes: 0 },
        { id: 'task-2-2', name: 'Documentation', hours: 0, minutes: 0 },
        { id: 'task-2-3', name: 'Training', hours: 0, minutes: 0 }
      ]
    },
    {
      id: 'proj-3',
      name: 'Support',
      hours: 0,
      minutes: 0,
      children: [
        { id: 'task-3-1', name: 'Customer Issues', hours: 0, minutes: 0 },
        { id: 'task-3-2', name: 'Internal Support', hours: 0, minutes: 0 }
      ]
    }
  ];

  useEffect(() => {
    const employeePreferences = preferences.find(p => p.employeeId === employee.id);
    if (employeePreferences) {
      setAllocations(employeePreferences.allocations);
      employeePreferences.allocations.forEach(a => {
        if (a.children) {
          setExpandedNodes(prev => new Set(prev).add(a.id));
        }
      });
    } else {
      setAllocations(defaultStructure);
    }
  }, [employee.id, preferences]);

  const totalAllocatedTime = useMemo(() => {
    const calculateTotal = (items: TimeAllocation[]): number => {
      return items.reduce((sum, item) => {
        const itemTotal = item.hours + item.minutes / 60;
        const childrenTotal = item.children ? calculateTotal(item.children) : 0;
        return sum + (item.children ? childrenTotal : itemTotal);
      }, 0);
    };
    return calculateTotal(allocations);
  }, [allocations]);

  useEffect(() => {
    const tolerance = 0.01;
    const isComplete = Math.abs(totalAllocatedTime - totalHoursWorked) < tolerance;
    setIsValid(isComplete);
    setShowWarning(enforceBeforeClockOut && !isComplete);
  }, [totalAllocatedTime, totalHoursWorked, enforceBeforeClockOut]);

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const updateAllocation = useCallback((id: string, hours: number, minutes: number, parentId?: string) => {
    setAllocations(prev => {
      const updateNode = (items: TimeAllocation[]): TimeAllocation[] => {
        return items.map(item => {
          if (item.id === id) {
            return { ...item, hours, minutes };
          }
          if (item.children) {
            return { ...item, children: updateNode(item.children) };
          }
          return item;
        });
      };
      return updateNode(prev);
    });
  }, []);

  const handleSave = () => {
    if (isValid || !enforceBeforeClockOut) {
      onAllocate(allocations);
    }
  };

  const AllocationNode = ({ node, level, parentId }: { 
    node: TimeAllocation; 
    level: number;
    parentId?: string;
  }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const indent = level * 32;

    const nodeColors: Record<string, string> = {
      'proj-1': 'border-[#0070f3]',
      'proj-2': 'border-[#10b981]',
      'proj-3': 'border-[#f59e0b]'
    };

    return (
      <div>
        <div 
          className={`flex items-center py-3 px-2 hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent rounded-lg transition-all duration-200 ${
            level === 0 ? 'border-l-4 ' + (nodeColors[node.id] || 'border-gray-400') : ''
          }`}
          style={{ paddingLeft: `${indent}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpand(node.id)}
              className="p-1.5 hover:bg-[#0070f3]/10 rounded-lg mr-3 transition-colors duration-200"
            >
              {isExpanded ? 
                <ChevronDown size={18} className="text-[#0070f3]" /> : 
                <ChevronRight size={18} className="text-gray-500" />
              }
            </button>
          )}
          {!hasChildren && <div className="w-8 mr-3" />}
          
          <div className="flex-1 flex items-center justify-between">
            <span className={`font-medium ${level === 0 ? 'text-lg text-gray-900' : 'text-gray-700'}`}>
              {node.name}
            </span>
            
            {!hasChildren && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={node.hours}
                    onChange={(e) => updateAllocation(node.id, parseInt(e.target.value) || 0, node.minutes, parentId)}
                    className="w-16 px-3 py-2 border-2 border-gray-200 rounded-lg text-center font-semibold focus:border-[#0070f3] focus:ring-2 focus:ring-[#0070f3]/20 transition-all duration-200"
                    placeholder="H"
                  />
                  <span className="absolute -top-2 left-2 text-xs bg-white px-1 text-gray-500">Hours</span>
                </div>
                <span className="text-gray-400 text-xl">:</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="15"
                    value={node.minutes}
                    onChange={(e) => updateAllocation(node.id, node.hours, parseInt(e.target.value) || 0, parentId)}
                    className="w-16 px-3 py-2 border-2 border-gray-200 rounded-lg text-center font-semibold focus:border-[#0070f3] focus:ring-2 focus:ring-[#0070f3]/20 transition-all duration-200"
                    placeholder="M"
                  />
                  <span className="absolute -top-2 left-2 text-xs bg-white px-1 text-gray-500">Mins</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4 border-l-2 border-gray-100">
            {node.children!.map(child => (
              <AllocationNode 
                key={child.id} 
                node={child} 
                level={level + 1}
                parentId={node.id}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const progressPercentage = (totalAllocatedTime / totalHoursWorked) * 100;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 transition-all duration-300 hover:shadow-xl">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-[#10b981]/10 to-[#0070f3]/10 rounded-lg">
            <Clock className="text-[#10b981]" size={24} />
          </div>
          Time Allocation
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <User size={20} className="text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Employee</p>
              <p className="font-semibold text-gray-900">{employee.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-semibold text-gray-900">
                  {totalAllocatedTime.toFixed(2)} / {totalHoursWorked} hours
                </span>
              </div>
              <div className="w-48 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 rounded-full ${
                    isValid 
                      ? 'bg-gradient-to-r from-[#10b981] to-[#0070f3]' 
                      : progressPercentage > 100 
                        ? 'bg-red-500' 
                        : 'bg-gradient-to-r from-[#f59e0b] to-[#0070f3]'
                  }`}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
            </div>
            {isValid && (
              <CheckCircle size={24} className="text-[#10b981]" />
            )}
          </div>
        </div>
      </div>

      {showWarning && (
        <div className="mb-6 p-4 bg-gradient-to-r from-[#f59e0b]/10 to-[#f59e0b]/5 border-2 border-[#f59e0b]/30 rounded-xl flex items-start gap-3 animate-pulse">
          <AlertCircle size={20} className="text-[#f59e0b] mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-gray-900">Time allocation required</p>
            <p className="text-sm text-gray-700 mt-1">
              Please allocate exactly {totalHoursWorked} hours before clocking out
            </p>
          </div>
        </div>
      )}

      <div className="border-2 border-gray-200 rounded-xl p-4 mb-6 bg-gradient-to-br from-gray-50/50 to-transparent">
        {allocations.map(node => (
          <AllocationNode key={node.id} node={node} level={0} />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm text-gray-600">
          {preferences.length > 0 && (
            <span className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#10b981] rounded-full animate-pulse"></div>
              Using saved preferences from last session
            </span>
          )}
        </div>
        
        <button
          onClick={handleSave}
          disabled={enforceBeforeClockOut && !isValid}
          className={`
            flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105
            ${isValid || !enforceBeforeClockOut
              ? 'bg-gradient-to-r from-[#0070f3] to-[#10b981] text-white shadow-lg hover:shadow-xl' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'}
          `}
        >
          <Save size={20} />
          Save Allocation
        </button>
      </div>
    </div>
  );
};

export default TimeAllocationTreeStyled;