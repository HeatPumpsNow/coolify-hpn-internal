import type { Meta, StoryObj } from '@storybook/react';
import { DataTable } from './DataTable';

const meta = {
  title: 'Features/Data/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: 'select',
      options: ['default', 'minimal', 'modern'],
    },
    searchable: { control: 'boolean' },
    paginated: { control: 'boolean' },
    sortable: { control: 'boolean' },
    selectable: { control: 'boolean' },
    striped: { control: 'boolean' },
    bordered: { control: 'boolean' },
    compact: { control: 'boolean' },
    loading: { control: 'boolean' },
    pageSize: { control: 'number' },
  },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data for opportunities (Sales Portal)
const opportunitiesData = [
  { id: 1, customer: 'John Smith', address: '123 Main St, Austin, TX', value: 45000, stage: 'Proposal', probability: 75, lastContact: '2024-01-15' },
  { id: 2, customer: 'Sarah Johnson', address: '456 Oak Ave, Dallas, TX', value: 32000, stage: 'Qualification', probability: 40, lastContact: '2024-01-14' },
  { id: 3, customer: 'Mike Williams', address: '789 Pine Rd, Houston, TX', value: 58000, stage: 'Negotiation', probability: 90, lastContact: '2024-01-16' },
  { id: 4, customer: 'Emily Davis', address: '321 Elm St, San Antonio, TX', value: 28000, stage: 'Discovery', probability: 25, lastContact: '2024-01-13' },
  { id: 5, customer: 'Robert Brown', address: '654 Maple Dr, Austin, TX', value: 62000, stage: 'Closed Won', probability: 100, lastContact: '2024-01-12' },
  { id: 6, customer: 'Lisa Anderson', address: '987 Cedar Ln, Fort Worth, TX', value: 41000, stage: 'Proposal', probability: 60, lastContact: '2024-01-11' },
  { id: 7, customer: 'David Wilson', address: '147 Birch Blvd, Plano, TX', value: 35000, stage: 'Qualification', probability: 35, lastContact: '2024-01-10' },
  { id: 8, customer: 'Jennifer Martin', address: '258 Spruce Way, Arlington, TX', value: 52000, stage: 'Negotiation', probability: 85, lastContact: '2024-01-09' },
];

const opportunityColumns = [
  { 
    id: 'customer', 
    header: 'Customer', 
    accessor: 'customer',
    sortable: true,
    filterable: true,
  },
  { 
    id: 'address', 
    header: 'Address', 
    accessor: 'address',
    sortable: true,
    filterable: true,
  },
  { 
    id: 'value', 
    header: 'Value', 
    accessor: 'value',
    sortable: true,
    render: (value: number) => `$${value.toLocaleString()}`,
    align: 'right' as const,
  },
  { 
    id: 'stage', 
    header: 'Stage', 
    accessor: 'stage',
    sortable: true,
    render: (value: string) => {
      const colors: Record<string, string> = {
        'Discovery': 'bg-gray-100 text-gray-800',
        'Qualification': 'bg-blue-100 text-blue-800',
        'Proposal': 'bg-yellow-100 text-yellow-800',
        'Negotiation': 'bg-purple-100 text-purple-800',
        'Closed Won': 'bg-green-100 text-green-800',
        'Closed Lost': 'bg-red-100 text-red-800',
      };
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[value] || 'bg-gray-100'}`}>
          {value}
        </span>
      );
    },
  },
  { 
    id: 'probability', 
    header: 'Probability', 
    accessor: 'probability',
    sortable: true,
    render: (value: number) => `${value}%`,
    align: 'center' as const,
  },
  { 
    id: 'lastContact', 
    header: 'Last Contact', 
    accessor: 'lastContact',
    sortable: true,
  },
];

// Sample data for employees (Employee Portal)
const employeesData = [
  { id: 1, name: 'Emma Thompson', role: 'Sales Manager', department: 'Sales', status: 'Active', hireDate: '2020-03-15', email: 'emma@company.com' },
  { id: 2, name: 'James Wilson', role: 'Field Technician', department: 'Service', status: 'Active', hireDate: '2021-06-20', email: 'james@company.com' },
  { id: 3, name: 'Olivia Martinez', role: 'HR Manager', department: 'Human Resources', status: 'Active', hireDate: '2019-01-10', email: 'olivia@company.com' },
  { id: 4, name: 'William Davis', role: 'Project Manager', department: 'Operations', status: 'Active', hireDate: '2020-09-05', email: 'william@company.com' },
  { id: 5, name: 'Sophia Rodriguez', role: 'Accountant', department: 'Finance', status: 'On Leave', hireDate: '2021-02-28', email: 'sophia@company.com' },
  { id: 6, name: 'Michael Brown', role: 'Service Tech', department: 'Service', status: 'Active', hireDate: '2022-04-15', email: 'michael@company.com' },
];

const employeeColumns = [
  { 
    id: 'name', 
    header: 'Name', 
    accessor: 'name',
    sortable: true,
    filterable: true,
  },
  { 
    id: 'role', 
    header: 'Role', 
    accessor: 'role',
    sortable: true,
    filterable: true,
  },
  { 
    id: 'department', 
    header: 'Department', 
    accessor: 'department',
    sortable: true,
  },
  { 
    id: 'status', 
    header: 'Status', 
    accessor: 'status',
    sortable: true,
    render: (value: string) => {
      const color = value === 'Active' ? 'text-green-600' : 'text-yellow-600';
      return <span className={`font-medium ${color}`}>{value}</span>;
    },
  },
  { 
    id: 'email', 
    header: 'Email', 
    accessor: 'email',
    filterable: true,
  },
  { 
    id: 'hireDate', 
    header: 'Hire Date', 
    accessor: 'hireDate',
    sortable: true,
  },
];

// Sample data for projects (Project Portal)
const projectsData = [
  { id: 'PRJ-001', name: 'Downtown Office HVAC', client: 'ABC Corp', status: 'In Progress', progress: 65, budget: 125000, deadline: '2024-02-28' },
  { id: 'PRJ-002', name: 'Residential Complex', client: 'XYZ Properties', status: 'Planning', progress: 15, budget: 280000, deadline: '2024-04-15' },
  { id: 'PRJ-003', name: 'Hospital Wing Renovation', client: 'City Hospital', status: 'In Progress', progress: 80, budget: 450000, deadline: '2024-01-31' },
  { id: 'PRJ-004', name: 'School District Upgrade', client: 'Austin ISD', status: 'Completed', progress: 100, budget: 320000, deadline: '2024-01-10' },
  { id: 'PRJ-005', name: 'Mall Retrofit', client: 'Retail Group', status: 'On Hold', progress: 35, budget: 195000, deadline: '2024-03-20' },
];

const projectColumns = [
  { 
    id: 'id', 
    header: 'Project ID', 
    accessor: 'id',
    width: '100px',
  },
  { 
    id: 'name', 
    header: 'Project Name', 
    accessor: 'name',
    sortable: true,
    filterable: true,
  },
  { 
    id: 'client', 
    header: 'Client', 
    accessor: 'client',
    sortable: true,
    filterable: true,
  },
  { 
    id: 'status', 
    header: 'Status', 
    accessor: 'status',
    sortable: true,
    render: (value: string) => {
      const colors: Record<string, string> = {
        'Planning': 'bg-blue-100 text-blue-800',
        'In Progress': 'bg-yellow-100 text-yellow-800',
        'Completed': 'bg-green-100 text-green-800',
        'On Hold': 'bg-gray-100 text-gray-800',
      };
      return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors[value]}`}>
          {value}
        </span>
      );
    },
  },
  { 
    id: 'progress', 
    header: 'Progress', 
    accessor: 'progress',
    sortable: true,
    render: (value: number) => (
      <div className="w-full">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">{value}%</span>
        </div>
      </div>
    ),
  },
  { 
    id: 'budget', 
    header: 'Budget', 
    accessor: 'budget',
    sortable: true,
    render: (value: number) => `$${value.toLocaleString()}`,
    align: 'right' as const,
  },
  { 
    id: 'deadline', 
    header: 'Deadline', 
    accessor: 'deadline',
    sortable: true,
  },
];

// Story configurations
export const SalesOpportunities: Story = {
  args: {
    columns: opportunityColumns,
    data: opportunitiesData,
    searchable: true,
    searchPlaceholder: 'Search opportunities...',
    paginated: true,
    pageSize: 5,
    sortable: true,
    selectable: true,
    striped: false,
    bordered: true,
    theme: 'default',
    actions: [
      {
        label: 'Export Selected',
        onClick: (rows) => console.log('Export:', rows),
        variant: 'primary',
        requiresSelection: true,
      },
      {
        label: 'Create Quote',
        onClick: (rows) => console.log('Create quote for:', rows),
        variant: 'secondary',
        requiresSelection: true,
      },
    ],
    onRowClick: (row) => console.log('Clicked opportunity:', row),
  },
};

export const EmployeeDirectory: Story = {
  args: {
    columns: employeeColumns,
    data: employeesData,
    searchable: true,
    searchPlaceholder: 'Search employees...',
    paginated: false,
    sortable: true,
    selectable: false,
    striped: true,
    bordered: true,
    theme: 'minimal',
    onRowClick: (row) => console.log('View employee:', row),
  },
};

export const ProjectManagement: Story = {
  args: {
    columns: projectColumns,
    data: projectsData,
    searchable: true,
    searchPlaceholder: 'Search projects...',
    paginated: true,
    pageSize: 10,
    sortable: true,
    selectable: true,
    striped: false,
    bordered: true,
    theme: 'modern',
    actions: [
      {
        label: 'View Details',
        onClick: (rows) => console.log('View:', rows),
        variant: 'primary',
        requiresSelection: true,
      },
      {
        label: 'Generate Report',
        onClick: (rows) => console.log('Report:', rows),
        variant: 'secondary',
      },
    ],
  },
};

export const CompactView: Story = {
  args: {
    columns: employeeColumns.slice(0, 4),
    data: employeesData,
    searchable: false,
    paginated: false,
    sortable: true,
    selectable: false,
    striped: false,
    bordered: false,
    compact: true,
    theme: 'minimal',
  },
};

export const LoadingState: Story = {
  args: {
    columns: [],
    data: [],
    loading: true,
  },
};

export const EmptyState: Story = {
  args: {
    columns: opportunityColumns,
    data: [],
    searchable: true,
    emptyMessage: 'No opportunities found. Create your first opportunity to get started.',
    theme: 'default',
  },
};

export const NoSearchResults: Story = {
  args: {
    columns: opportunityColumns,
    data: opportunitiesData,
    searchable: true,
    searchPlaceholder: 'Try searching for "nonexistent"',
    theme: 'default',
  },
};

// Line Items for Estimates/Bids (Critical for Sales & Project Portals)
const lineItemsData = [
  // EQUIPMENT CATEGORY
  { 
    id: 1, 
    category: 'Equipment', 
    group: 'Heat Pump System',
    item: 'Mitsubishi 36k BTU Hyper Heat Pump', 
    description: '3-ton dual zone outdoor unit with hyper heating',
    quantity: 1, 
    unit: 'unit',
    cost: 3200,
    markup: 65,
    price: 5280,
    margin: 39.4,
    taxable: true 
  },
  { 
    id: 2, 
    category: 'Equipment', 
    group: 'Heat Pump System',
    item: 'Indoor Air Handler - 2 Ton', 
    description: 'Variable speed air handler with ECM motor',
    quantity: 1, 
    unit: 'unit',
    cost: 1100,
    markup: 65,
    price: 1815,
    margin: 39.4,
    taxable: true 
  },
  { 
    id: 3, 
    category: 'Equipment', 
    group: 'Heat Pump System',
    item: 'Indoor Mini Split Head - 1 Ton', 
    description: 'Wall mounted ductless unit with remote',
    quantity: 1, 
    unit: 'unit',
    cost: 650,
    markup: 65,
    price: 1072.50,
    margin: 39.4,
    taxable: true 
  },
  
  // MATERIALS CATEGORY
  { 
    id: 4, 
    category: 'Materials', 
    group: 'Refrigerant Lines',
    item: '3/8" x 3/4" Line Set', 
    description: 'Insulated copper line set',
    quantity: 50, 
    unit: 'ft',
    cost: 12,
    markup: 85,
    price: 22.20,
    margin: 45.9,
    taxable: true 
  },
  { 
    id: 5, 
    category: 'Materials', 
    group: 'Electrical',
    item: 'Disconnect Box', 
    description: '60A weatherproof disconnect',
    quantity: 1, 
    unit: 'unit',
    cost: 45,
    markup: 100,
    price: 90,
    margin: 50,
    taxable: true 
  },
  { 
    id: 6, 
    category: 'Materials', 
    group: 'Electrical',
    item: '10/2 Romex Wire', 
    description: 'Electrical wire for heat pump circuit',
    quantity: 75, 
    unit: 'ft',
    cost: 2.50,
    markup: 100,
    price: 5.00,
    margin: 50,
    taxable: true 
  },
  
  // LABOR CATEGORY
  { 
    id: 7, 
    category: 'Labor', 
    group: 'Installation',
    item: 'Lead Installer', 
    description: 'Senior HVAC technician',
    quantity: 16, 
    unit: 'hr',
    cost: 45,
    markup: 122,
    price: 100,
    margin: 55,
    taxable: false 
  },
  { 
    id: 8, 
    category: 'Labor', 
    group: 'Installation',
    item: 'Apprentice Installer', 
    description: 'Installation assistant',
    quantity: 16, 
    unit: 'hr',
    cost: 25,
    markup: 100,
    price: 50,
    margin: 50,
    taxable: false 
  },
  { 
    id: 9, 
    category: 'Labor', 
    group: 'Electrical',
    item: 'Electrician', 
    description: 'Licensed electrician for panel work',
    quantity: 4, 
    unit: 'hr',
    cost: 55,
    markup: 82,
    price: 100,
    margin: 45,
    taxable: false 
  },
  
  // PERMITS & FEES
  { 
    id: 10, 
    category: 'Permits', 
    group: 'City Permits',
    item: 'Mechanical Permit', 
    description: 'City of Austin mechanical permit',
    quantity: 1, 
    unit: 'permit',
    cost: 185,
    markup: 0,
    price: 185,
    margin: 0,
    taxable: false 
  },
  { 
    id: 11, 
    category: 'Permits', 
    group: 'City Permits',
    item: 'Electrical Permit', 
    description: 'Electrical permit for new circuit',
    quantity: 1, 
    unit: 'permit',
    cost: 125,
    markup: 0,
    price: 125,
    margin: 0,
    taxable: false 
  },
];

const lineItemColumns = [
  { 
    id: 'category', 
    header: 'Category', 
    accessor: 'category',
    sortable: true,
    render: (value: string) => {
      const colors: Record<string, string> = {
        'Equipment': 'text-blue-700 font-semibold',
        'Materials': 'text-green-700 font-semibold',
        'Labor': 'text-purple-700 font-semibold',
        'Permits': 'text-orange-700 font-semibold',
      };
      return <span className={colors[value] || 'text-gray-700'}>{value}</span>;
    },
  },
  { 
    id: 'group', 
    header: 'Group', 
    accessor: 'group',
    sortable: true,
    filterable: true,
  },
  { 
    id: 'item', 
    header: 'Item', 
    accessor: 'item',
    sortable: true,
    filterable: true,
  },
  { 
    id: 'description', 
    header: 'Description', 
    accessor: 'description',
    width: '250px',
    render: (value: string) => (
      <span className="text-sm text-gray-600">{value}</span>
    ),
  },
  { 
    id: 'quantity', 
    header: 'Qty', 
    accessor: 'quantity',
    sortable: true,
    align: 'center' as const,
    render: (value: number, row: any) => (
      <div className="flex items-center gap-1">
        <input 
          type="number" 
          value={value} 
          className="w-16 px-2 py-1 border rounded text-center"
          onChange={(e) => console.log('Update quantity:', e.target.value)}
        />
        <span className="text-xs text-gray-500">{row.unit}</span>
      </div>
    ),
  },
  { 
    id: 'cost', 
    header: 'Cost', 
    accessor: 'cost',
    sortable: true,
    align: 'right' as const,
    render: (value: number, row: any) => {
      const total = value * row.quantity;
      return (
        <div className="text-right">
          <div className="font-medium">${total.toLocaleString()}</div>
          <div className="text-xs text-gray-500">${value}/{row.unit}</div>
        </div>
      );
    },
  },
  { 
    id: 'markup', 
    header: 'Markup %', 
    accessor: 'markup',
    sortable: true,
    align: 'center' as const,
    render: (value: number) => (
      <span className={`font-medium ${value >= 100 ? 'text-green-600' : value >= 50 ? 'text-blue-600' : 'text-gray-600'}`}>
        {value}%
      </span>
    ),
  },
  { 
    id: 'price', 
    header: 'Price', 
    accessor: 'price',
    sortable: true,
    align: 'right' as const,
    render: (value: number, row: any) => {
      const total = value * row.quantity;
      return (
        <div className="text-right">
          <div className="font-bold text-green-700">${total.toLocaleString()}</div>
          <div className="text-xs text-gray-500">${value}/{row.unit}</div>
        </div>
      );
    },
  },
  { 
    id: 'margin', 
    header: 'Margin %', 
    accessor: 'margin',
    sortable: true,
    align: 'center' as const,
    render: (value: number) => {
      const color = value >= 50 ? 'text-green-600' : value >= 35 ? 'text-blue-600' : value > 0 ? 'text-yellow-600' : 'text-gray-400';
      return <span className={`font-medium ${color}`}>{value.toFixed(1)}%</span>;
    },
  },
  { 
    id: 'taxable', 
    header: 'Tax', 
    accessor: 'taxable',
    align: 'center' as const,
    render: (value: boolean) => (
      <input 
        type="checkbox" 
        checked={value}
        onChange={(e) => console.log('Update taxable:', e.target.checked)}
        className="rounded border-gray-300"
      />
    ),
  },
];

export const EstimateLineItems: Story = {
  name: 'Estimate/Bid Line Items (Sales Portal)',
  args: {
    columns: lineItemColumns,
    data: lineItemsData,
    searchable: true,
    searchPlaceholder: 'Search line items...',
    paginated: false, // Usually want to see all line items
    sortable: true,
    selectable: true,
    striped: true,
    bordered: true,
    theme: 'default',
    actions: [
      {
        label: 'Add Line Item',
        onClick: () => console.log('Add new line item'),
        variant: 'primary',
      },
      {
        label: 'Delete Selected',
        onClick: (rows) => console.log('Delete:', rows),
        variant: 'danger',
        requiresSelection: true,
      },
      {
        label: 'Duplicate',
        onClick: (rows) => console.log('Duplicate:', rows),
        variant: 'secondary',
        requiresSelection: true,
      },
    ],
  },
};

// Summary table for estimate totals
const summaryData = [
  { category: 'Equipment', items: 3, cost: 4950, markup: 65, price: 8167.50, margin: 39.4, percentage: 42.3 },
  { category: 'Materials', items: 3, cost: 1027.50, markup: 91.4, price: 1967.50, margin: 47.8, percentage: 10.2 },
  { category: 'Labor', items: 3, cost: 1540, markup: 110.4, price: 3400, margin: 54.7, percentage: 17.6 },
  { category: 'Permits', items: 2, cost: 310, markup: 0, price: 310, margin: 0, percentage: 1.6 },
  { category: 'Subtotal', items: 11, cost: 7827.50, markup: 75.8, price: 13845, margin: 43.5, percentage: 71.7 },
  { category: 'Overhead (15%)', items: null, cost: null, markup: null, price: 2076.75, margin: null, percentage: 10.8 },
  { category: 'Profit (20%)', items: null, cost: null, markup: null, price: 3184.45, margin: null, percentage: 16.5 },
  { category: 'Tax (8.25%)', items: null, cost: null, markup: null, price: 195.26, margin: null, percentage: 1.0 },
];

const summaryColumns = [
  { 
    id: 'category', 
    header: 'Category', 
    accessor: 'category',
    render: (value: string) => (
      <span className={value.includes('Total') || value === 'Subtotal' ? 'font-bold text-lg' : 'font-medium'}>
        {value}
      </span>
    ),
  },
  { 
    id: 'items', 
    header: 'Items', 
    accessor: 'items',
    align: 'center' as const,
    render: (value: number | null) => value || '-',
  },
  { 
    id: 'cost', 
    header: 'Total Cost', 
    accessor: 'cost',
    align: 'right' as const,
    render: (value: number | null) => value ? `$${value.toLocaleString()}` : '-',
  },
  { 
    id: 'markup', 
    header: 'Avg Markup', 
    accessor: 'markup',
    align: 'center' as const,
    render: (value: number | null) => value ? `${value.toFixed(1)}%` : '-',
  },
  { 
    id: 'price', 
    header: 'Total Price', 
    accessor: 'price',
    align: 'right' as const,
    render: (value: number, row: any) => (
      <span className={row.category === 'Subtotal' || row.category.includes('Total') ? 'font-bold text-green-700' : ''}>
        ${value.toLocaleString()}
      </span>
    ),
  },
  { 
    id: 'margin', 
    header: 'Margin %', 
    accessor: 'margin',
    align: 'center' as const,
    render: (value: number | null) => {
      if (!value) return '-';
      const color = value >= 50 ? 'text-green-600' : value >= 35 ? 'text-blue-600' : 'text-yellow-600';
      return <span className={`font-medium ${color}`}>{value.toFixed(1)}%</span>;
    },
  },
  { 
    id: 'percentage', 
    header: '% of Total', 
    accessor: 'percentage',
    align: 'center' as const,
    render: (value: number) => (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full" 
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-sm">{value.toFixed(1)}%</span>
      </div>
    ),
  },
];

export const EstimateSummary: Story = {
  name: 'Estimate Summary Table',
  args: {
    columns: summaryColumns,
    data: summaryData,
    searchable: false,
    paginated: false,
    sortable: false,
    selectable: false,
    striped: false,
    bordered: true,
    theme: 'modern',
  },
};