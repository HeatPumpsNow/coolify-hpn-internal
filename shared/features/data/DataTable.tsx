'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '../../ui/components/Button';

// Column definition type
export interface Column<T = any> {
  id: string;
  header: string;
  accessor: string | ((row: T) => any);
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

// DataTable props
export interface DataTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  paginated?: boolean;
  pageSize?: number;
  sortable?: boolean;
  selectable?: boolean;
  onRowClick?: (row: T, index: number) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
  actions?: Array<{
    label: string;
    onClick: (selectedRows: T[]) => void;
    variant?: 'primary' | 'secondary' | 'danger';
    requiresSelection?: boolean;
  }>;
  emptyMessage?: string;
  loading?: boolean;
  striped?: boolean;
  bordered?: boolean;
  compact?: boolean;
  theme?: 'default' | 'minimal' | 'modern';
}

export function DataTable<T = any>({
  columns,
  data,
  searchable = false,
  searchPlaceholder = 'Search...',
  paginated = false,
  pageSize = 10,
  sortable = true,
  selectable = false,
  onRowClick,
  onSelectionChange,
  actions = [],
  emptyMessage = 'No data available',
  loading = false,
  striped = false,
  bordered = true,
  compact = false,
  theme = 'default',
}: DataTableProps<T>) {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Get value from row using accessor
  const getValue = (row: T, accessor: string | ((row: T) => any)) => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return accessor.split('.').reduce((obj, key) => obj?.[key], row as any);
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(row => {
      return columns.some(column => {
        if (column.filterable === false) return false;
        const value = getValue(row, column.accessor);
        return String(value).toLowerCase().includes(searchTerm.toLowerCase());
      });
    });
  }, [data, searchTerm, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig || !sortable) return filteredData;

    return [...filteredData].sort((a, b) => {
      const column = columns.find(col => col.id === sortConfig.key);
      if (!column) return 0;

      const aValue = getValue(a, column.accessor);
      const bValue = getValue(b, column.accessor);

      if (aValue === bValue) return 0;
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [filteredData, sortConfig, columns, sortable]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!paginated) return sortedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, paginated]);

  // Calculate total pages
  const totalPages = Math.ceil(sortedData.length / pageSize);

  // Handle sort
  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column?.sortable || !sortable) return;

    setSortConfig(current => {
      if (current?.key === columnId) {
        return {
          key: columnId,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key: columnId, direction: 'asc' };
    });
  };

  // Handle row selection
  const handleRowSelection = (index: number) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedRows(newSelection);
    
    if (onSelectionChange) {
      const selected = paginatedData.filter((_, i) => newSelection.has(i));
      onSelectionChange(selected);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const allIndices = new Set(paginatedData.map((_, i) => i));
      setSelectedRows(allIndices);
      onSelectionChange?.(paginatedData);
    }
  };

  // Theme styles
  const themeStyles = {
    default: {
      table: 'min-w-full divide-y divide-gray-200',
      header: 'bg-gray-50',
      headerCell: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
      body: 'bg-white divide-y divide-gray-200',
      row: 'hover:bg-gray-50',
      cell: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
    },
    minimal: {
      table: 'min-w-full',
      header: '',
      headerCell: 'px-4 py-2 text-left text-sm font-semibold text-gray-700',
      body: '',
      row: 'border-b border-gray-100 hover:bg-gray-50',
      cell: 'px-4 py-3 text-sm text-gray-900',
    },
    modern: {
      table: 'min-w-full',
      header: 'bg-gradient-to-r from-blue-50 to-indigo-50',
      headerCell: 'px-6 py-4 text-left text-xs font-bold text-blue-900 uppercase tracking-wide',
      body: 'bg-white',
      row: 'border-b border-blue-100 hover:bg-blue-50/50 transition-colors',
      cell: 'px-6 py-4 text-sm text-gray-900',
    },
  };

  const styles = themeStyles[theme];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-sm text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions Bar */}
      {(searchable || actions.length > 0) && (
        <div className="flex justify-between items-center">
          {searchable && (
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
            />
          )}
          
          {actions.length > 0 && (
            <div className="flex gap-2">
              {actions.map((action, i) => (
                <Button
                  key={i}
                  variant={action.variant || 'secondary'}
                  size="sm"
                  onClick={() => {
                    const selected = paginatedData.filter((_, i) => selectedRows.has(i));
                    action.onClick(selected);
                  }}
                  disabled={action.requiresSelection && selectedRows.size === 0}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className={`overflow-x-auto ${bordered ? 'border border-gray-200 rounded-lg' : ''}`}>
        <table className={styles.table}>
          <thead className={styles.header}>
            <tr>
              {selectable && (
                <th className={styles.headerCell}>
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              {columns.map(column => (
                <th
                  key={column.id}
                  className={`${styles.headerCell} ${column.sortable && sortable ? 'cursor-pointer select-none' : ''}`}
                  style={{ 
                    width: column.width,
                    textAlign: column.align || 'left'
                  }}
                  onClick={() => handleSort(column.id)}
                >
                  <div className="flex items-center gap-1">
                    {column.header}
                    {column.sortable && sortable && (
                      <span className="text-gray-400">
                        {sortConfig?.key === column.id ? (
                          sortConfig.direction === 'asc' ? '↑' : '↓'
                        ) : '↕'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={styles.body}>
            {paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`${styles.row} ${onRowClick ? 'cursor-pointer' : ''} ${
                    striped && rowIndex % 2 === 1 ? 'bg-gray-50' : ''
                  }`}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {selectable && (
                    <td className={styles.cell} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rowIndex)}
                        onChange={() => handleRowSelection(rowIndex)}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  {columns.map(column => {
                    const value = getValue(row, column.accessor);
                    return (
                      <td
                        key={column.id}
                        className={`${styles.cell} ${compact ? 'py-2' : ''}`}
                        style={{ textAlign: column.align || 'left' }}
                      >
                        {column.render ? column.render(value, row, rowIndex) : value}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginated && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * pageSize) + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of{' '}
            {sortedData.length} results
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}