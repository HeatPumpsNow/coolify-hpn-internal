import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { query } from '@/lib/database';
import { z } from 'zod';

const leadsQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
});

const createLeadSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip_code: z.string().min(5, 'ZIP code is required'),
  lead_source: z.string().optional(),
  notes: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams);
    const { status, search, page, limit } = leadsQuerySchema.parse(params);

    // Build dynamic query
    let whereConditions = [];
    let queryParams: any[] = [];
    let paramCount = 0;

    // Filter by sales rep territory (for non-managers)
    if (user.role === 'sales_rep') {
      // For now, show all leads - territory filtering can be added later
    }

    if (status) {
      paramCount++;
      whereConditions.push(`stage = $${paramCount}`);
      queryParams.push(status);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(
        customer_info->>'first_name' ILIKE $${paramCount} OR 
        customer_info->>'last_name' ILIKE $${paramCount} OR 
        customer_info->>'email' ILIKE $${paramCount} OR
        customer_info->>'phone' ILIKE $${paramCount} OR
        customer_info->>'address' ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    const offset = (page - 1) * limit;
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM sales_leads ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const leadsQuery = `
      SELECT 
        l.id, l.lead_number, l.source, l.customer_info, l.stage, l.priority,
        l.education_progress, l.knowledge_score, l.communication_notes,
        l.created_at, l.updated_at,
        sr.first_name as rep_first_name, sr.last_name as rep_last_name
      FROM sales_leads l
      LEFT JOIN sales_reps sr ON l.assigned_sales_rep = sr.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const leadsResult = await query(leadsQuery, queryParams);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        leads: leadsResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      },
    });
  } catch (error) {
    console.error('Leads fetch error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid query parameters',
            details: error.errors 
          } 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const leadData = createLeadSchema.parse(body);

    // Generate lead number
    const leadNumber = `LEAD-${Date.now()}`;
    
    // Create customer info object
    const customerInfo = {
      first_name: leadData.first_name,
      last_name: leadData.last_name,
      email: leadData.email,
      phone: leadData.phone,
      address: leadData.address,
      city: leadData.city,
      state: leadData.state,
      zip_code: leadData.zip_code,
    };

    // Create new lead
    const insertQuery = `
      INSERT INTO sales_leads (
        lead_number, source, customer_info, stage, priority,
        communication_notes, assigned_sales_rep
      ) VALUES (
        $1, $2, $3, 'new', $4, $5, $6
      ) RETURNING id, created_at
    `;

    const result = await query(insertQuery, [
      leadNumber,
      leadData.lead_source || 'phone_inquiry',
      JSON.stringify(customerInfo),
      leadData.priority,
      leadData.notes || '',
      user.id, // assigned_sales_rep
    ]);

    const newLead = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: newLead.id,
        message: 'Lead created successfully',
        created_at: newLead.created_at,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Lead creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid lead data',
            details: error.errors 
          } 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}