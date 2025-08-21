import type { Meta, StoryObj } from '@storybook/react';
import { LoginPage } from './LoginPage';

const meta = {
  title: 'Features/Auth/LoginPage',
  component: LoginPage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    portalType: {
      control: 'select',
      options: ['sales', 'employee', 'owner', 'customer', 'service', 'project'],
    },
    showRememberMe: {
      control: 'boolean',
    },
    showDemoUsers: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof LoginPage>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sales Portal Configuration
export const SalesPortal: Story = {
  args: {
    portalType: 'sales',
    portalName: 'Sales Portal',
    showRememberMe: true,
    showDemoUsers: true,
    demoUsers: [
      {
        id: 'sales-rep',
        name: 'Sam Seller',
        role: 'Sales Representative',
        email: 'sales@heatpumpsnow.com',
        password: 'Test123!@#',
      },
      {
        id: 'sales-manager',
        name: 'Sarah Manager',
        role: 'Sales Manager',
        email: 'sales.manager@heatpumpsnow.com',
        password: 'Test123!@#',
      },
      {
        id: 'test-user',
        name: 'Test User',
        role: 'Multi-Portal Access',
        email: 'test@heatpumpsnow.com',
        password: 'password123',
      },
    ],
    helpLink: {
      text: 'sales manager',
      href: '/support',
    },
    customBranding: {
      primaryColor: '#2563eb',
      backgroundColor: 'linear-gradient(to bottom right, #eff6ff, #ffffff)',
    },
  },
};

// Employee Portal Configuration
export const EmployeePortal: Story = {
  args: {
    portalType: 'employee',
    portalName: 'Employee Portal',
    showRememberMe: true,
    showDemoUsers: true,
    demoUsers: [
      {
        id: 'employee',
        name: 'Emma Employee',
        role: 'Employee',
        email: 'employee@heatpumpsnow.com',
        password: 'Test123!@#',
      },
      {
        id: 'field-tech',
        name: 'Frank Field',
        role: 'Field Tech',
        email: 'field@heatpumpsnow.com',
        password: 'Test123!@#',
      },
      {
        id: 'hr-manager',
        name: 'Helen Resources',
        role: 'HR Manager',
        email: 'hr@heatpumpsnow.com',
        password: 'Test123!@#',
      },
    ],
    customBranding: {
      primaryColor: '#10b981',
      backgroundColor: 'linear-gradient(to bottom right, #f0fdf4, #ffffff)',
    },
  },
};

// Owner Portal Configuration (Executive)
export const OwnerPortal: Story = {
  args: {
    portalType: 'owner',
    portalName: 'Executive Dashboard',
    showRememberMe: false,
    showDemoUsers: false,
    customBranding: {
      primaryColor: '#6366f1',
      backgroundColor: 'linear-gradient(to bottom right, #eef2ff, #ffffff)',
      cardBackground: '#fafafa',
    },
    helpLink: {
      text: 'IT administrator',
      href: '/admin-support',
    },
  },
};

// Customer Portal Configuration
export const CustomerPortal: Story = {
  args: {
    portalType: 'customer',
    portalName: 'Customer Portal',
    showRememberMe: true,
    showDemoUsers: true,
    demoUsers: [
      {
        id: 'demo-customer',
        name: 'Demo Customer',
        role: 'Homeowner',
        email: 'demo@customer.com',
        password: 'demo123',
      },
    ],
    customBranding: {
      primaryColor: '#f59e0b',
      backgroundColor: 'linear-gradient(to bottom right, #fffbeb, #ffffff)',
    },
  },
};

// Service Portal Configuration
export const ServicePortal: Story = {
  args: {
    portalType: 'service',
    portalName: 'Service Technician Portal',
    showRememberMe: true,
    showDemoUsers: true,
    demoUsers: [
      {
        id: 'tech-1',
        name: 'Tom Technician',
        role: 'Service Tech',
        email: 'tech@heatpumpsnow.com',
        password: 'Test123!@#',
      },
      {
        id: 'tech-lead',
        name: 'Laura Lead',
        role: 'Lead Technician',
        email: 'lead.tech@heatpumpsnow.com',
        password: 'Test123!@#',
      },
    ],
    customBranding: {
      primaryColor: '#8b5cf6',
      backgroundColor: 'linear-gradient(to bottom right, #faf5ff, #ffffff)',
    },
  },
};

// Project Portal Configuration
export const ProjectPortal: Story = {
  args: {
    portalType: 'project',
    portalName: 'Project Management',
    showRememberMe: true,
    showDemoUsers: true,
    demoUsers: [
      {
        id: 'pm-1',
        name: 'Patricia PM',
        role: 'Project Manager',
        email: 'pm@heatpumpsnow.com',
        password: 'Test123!@#',
      },
      {
        id: 'coordinator',
        name: 'Carlos Coordinator',
        role: 'Project Coordinator',
        email: 'coordinator@heatpumpsnow.com',
        password: 'Test123!@#',
      },
    ],
    customBranding: {
      primaryColor: '#06b6d4',
      backgroundColor: 'linear-gradient(to bottom right, #ecfeff, #ffffff)',
    },
  },
};

// Error State
export const WithError: Story = {
  args: {
    portalType: 'sales',
    portalName: 'Sales Portal',
    onLogin: async () => {
      throw new Error('Invalid credentials. Please check your email and password.');
    },
  },
};

// Loading State
export const Loading: Story = {
  args: {
    portalType: 'sales',
    portalName: 'Sales Portal',
    onLogin: async () => {
      // Simulate long loading
      await new Promise(resolve => setTimeout(resolve, 10000));
    },
  },
};

// Minimal Configuration
export const Minimal: Story = {
  args: {
    portalType: 'sales',
    showRememberMe: false,
    showDemoUsers: false,
  },
};