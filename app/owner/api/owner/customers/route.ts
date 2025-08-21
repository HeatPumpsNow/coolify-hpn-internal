import { NextRequest, NextResponse } from 'next/server';
import OwnerAuthService from '@/lib/auth-owner';
import { query } from '@/lib/database';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate owner
    const tokenCookie = request.cookies.get('owner_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { verifyOwnerToken } = await import('@/lib/auth');
    const owner = await verifyOwnerToken(tokenCookie.value);
    if (!owner) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build query
    let whereClause = 'WHERE 1=1';
    const queryParams: any[] = [];

    if (status !== 'all') {
      whereClause += ` AND c.portal_access_enabled = $${queryParams.length + 1}`;
      queryParams.push(status === 'active');
    }

    if (search) {
      whereClause += ` AND (c.first_name ILIKE $${queryParams.length + 1} OR c.last_name ILIKE $${queryParams.length + 1} OR c.email ILIKE $${queryParams.length + 1})`;
      queryParams.push(`%${search}%`);
    }

    // Get customers with job statistics
    const customersResult = await query(`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.zip_code,
        c.notes,
        c.preferred_contact_method,
        c.created_at,
        c.updated_at,
        c.portal_access_enabled,
        COUNT(j.id) as actual_job_count,
        SUM(CASE WHEN j.status = 'completed' THEN j.total_amount ELSE 0 END) as actual_total_spent,
        MAX(j.actual_end_time) as last_completed_job,
        AVG(CASE WHEN j.status = 'completed' THEN j.customer_rating END) as avg_rating_given,
        COUNT(CASE WHEN j.status = 'scheduled' OR j.status = 'in-progress' THEN 1 END) as active_jobs,
        COUNT(CASE WHEN j.scheduled_date > CURRENT_DATE THEN 1 END) as upcoming_jobs
      FROM customers c
      LEFT JOIN jobs j ON (c.first_name || ' ' || c.last_name) = j.customer_name
      ${whereClause}
      GROUP BY c.id, c.first_name, c.last_name, c.email, c.phone, c.address, c.city, c.state, c.zip_code, c.notes, c.preferred_contact_method, c.created_at, c.updated_at, c.portal_access_enabled
      ORDER BY 
        CASE WHEN $${queryParams.length + 1} = 'name' THEN c.first_name END ${sortOrder},
        CASE WHEN $${queryParams.length + 1} = 'jobs' THEN COUNT(j.id) END ${sortOrder === 'asc' ? 'ASC' : 'DESC'},
        CASE WHEN $${queryParams.length + 1} = 'spent' THEN SUM(CASE WHEN j.status = 'completed' THEN j.total_amount ELSE 0 END) END ${sortOrder === 'asc' ? 'ASC' : 'DESC'},
        CASE WHEN $${queryParams.length + 1} = 'last_job' THEN MAX(j.actual_end_time) END ${sortOrder === 'asc' ? 'ASC' : 'DESC'} NULLS LAST
    `, [...queryParams, sortBy]);

    // Get customer summary statistics
    const summaryResult = await query(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN portal_access_enabled = true THEN 1 END) as active_customers,
        0 as avg_customer_value,
        0 as total_revenue,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_customers,
        COUNT(CASE WHEN created_at < CURRENT_DATE - INTERVAL '90 days' THEN 1 END) as inactive_customers
      FROM customers
    `);

    // Get recent customer activities
    const activitiesResult = await query(`
      SELECT 
        ba.type,
        ba.description,
        ba.created_at,
        ba.related_id,
        c.first_name,
        c.last_name
      FROM business_activities ba
      LEFT JOIN customers c ON ba.related_id::uuid = c.id
      WHERE ba.related_type = 'customer'
      ORDER BY ba.created_at DESC
      LIMIT 10
    `);

    // Format customer data
    const customers = customersResult.rows.map(customer => ({
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      fullName: `${customer.first_name} ${customer.last_name}`,
      email: customer.email,
      phone: customer.phone,
      address: {
        street: customer.address,
        city: customer.city,
        state: customer.state,
        zip: customer.zip_code,
        full: `${customer.address}, ${customer.city}, ${customer.state} ${customer.zip_code}`
      },
      totalJobs: parseInt(customer.actual_job_count) || 0,
      totalSpent: parseFloat(customer.actual_total_spent) || 0,
      lastJobDate: customer.last_completed_job,
      preferredEmployees: [],
      notes: customer.notes,
      status: customer.portal_access_enabled ? 'active' : 'inactive',
      averageRating: customer.avg_rating_given ? parseFloat(customer.avg_rating_given).toFixed(1) : null,
      activeJobs: parseInt(customer.active_jobs) || 0,
      upcomingJobs: parseInt(customer.upcoming_jobs) || 0,
      customerSince: customer.created_at,
      lastUpdate: customer.updated_at,
      preferredContactMethod: customer.preferred_contact_method,
      // Customer lifecycle stage
      lifeCycleStage: customer.actual_job_count === 0 ? 'prospect' :
                     customer.last_completed_job && new Date(customer.last_completed_job) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) ? 'active' :
                     customer.last_completed_job && new Date(customer.last_completed_job) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) ? 'recent' : 'inactive'
    }));

    // Format summary data
    const summary = summaryResult.rows[0];
    const customerSummary = {
      totalCustomers: parseInt(summary.total_customers) || 0,
      activeCustomers: parseInt(summary.active_customers) || 0,
      averageCustomerValue: parseFloat(summary.avg_customer_value) || 0,
      totalRevenue: parseFloat(summary.total_revenue) || 0,
      recentCustomers: parseInt(summary.recent_customers) || 0,
      inactiveCustomers: parseInt(summary.inactive_customers) || 0
    };

    // Format recent activities
    const recentActivities = activitiesResult.rows.map(activity => ({
      type: activity.type,
      description: activity.description,
      timestamp: activity.created_at,
      customerName: activity.first_name && activity.last_name ? `${activity.first_name} ${activity.last_name}` : 'Unknown Customer'
    }));

    return NextResponse.json({
      customers,
      summary: customerSummary,
      recentActivities
    });

  } catch (error) {
    logger.error('Get customers error', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate owner
    const tokenCookie = request.cookies.get('owner_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { verifyOwnerToken } = await import('@/lib/auth');
    const owner = await verifyOwnerToken(tokenCookie.value);
    if (!owner) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      addressStreet,
      addressCity,
      addressState,
      addressZip,
      notes,
      preferredEmployees
    } = await request.json();

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Check if customer already exists
    const existingCustomer = await query(`
      SELECT id FROM customers 
      WHERE first_name = $1 AND last_name = $2 AND email = $3
    `, [firstName, lastName, email]);

    if (existingCustomer.rows.length > 0) {
      return NextResponse.json(
        { error: 'Customer with this name and email already exists' },
        { status: 409 }
      );
    }

    // Create customer
    const result = await query(`
      INSERT INTO customers (
        first_name, last_name, email, phone, 
        address_street, address_city, address_state, address_zip,
        notes, preferred_employees, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', NOW(), NOW())
      RETURNING id, first_name, last_name, email, phone, status, created_at
    `, [
      firstName,
      lastName,
      email || null,
      phone || null,
      addressStreet || null,
      addressCity || null,
      addressState || null,
      addressZip || null,
      notes || null,
      preferredEmployees || []
    ]);

    const newCustomer = result.rows[0];

    // Log activity
    await query(`
      INSERT INTO business_activities (type, description, related_id, related_type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [
      'customer_added',
      `New customer ${firstName} ${lastName} added to CRM`,
      newCustomer.id,
      'customer'
    ]);

    logger.info('Customer created', {
      customerId: newCustomer.id,
      customerName: `${firstName} ${lastName}`,
      createdBy: owner.id
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: newCustomer.id,
        firstName: newCustomer.first_name,
        lastName: newCustomer.last_name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        status: newCustomer.status,
        createdAt: newCustomer.created_at
      }
    });

  } catch (error) {
    logger.error('Create customer error', error);
    return NextResponse.json(
      { error: 'Failed to create customer' },
      { status: 500 }
    );
  }
}