# Shared Features Architecture

## Overview

This directory contains cross-portal features that can be composed and configured differently across portals. Each feature is self-contained with its own business logic, UI components, and API endpoints.

## Feature Structure

```
shared/features/
├── estimating/          # Estimation feature (used in sales, service, owner portals)
├── service-requests/    # Service request management
├── messaging/          # Real-time messaging
├── photo-management/   # Photo upload and management
├── job-management/     # Job lifecycle management
├── analytics/          # Analytics and reporting
└── scheduling/         # Appointment scheduling
```

## How Features Work

Each feature exports:
1. **Core logic** - Business rules and calculations
2. **Components** - UI components with portal-specific variants
3. **API handlers** - Standardized API endpoints
4. **Database models** - Shared data structures
5. **Permissions** - Role-based access control

## Portal Integration

Portals import features and configure them:

```typescript
import { EstimatingFeature } from '@heat-pumps-now/features/estimating';

// Sales Portal - Full access
const estimating = EstimatingFeature.configure({
  portal: 'sales',
  permissions: ['create', 'edit', 'approve', 'export'],
  components: ['full-editor', 'pricing-engine', 'approval-workflow']
});

// Service Portal - Limited access
const estimating = EstimatingFeature.configure({
  portal: 'service',
  permissions: ['view', 'suggest-items'],
  components: ['viewer', 'quick-add']
});
```