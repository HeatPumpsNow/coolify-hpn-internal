import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const customerType = searchParams.get('type');
    const search = searchParams.get('search');

    // Build query
    let queryText = `
      SELECT 
        c.*,
        COUNT(DISTINCT o.id) as opportunity_count,
        COUNT(DISTINCT e.id) as estimate_count,
        SUM(o.value) as total_opportunity_value
      FROM customers c
      LEFT JOIN opportunities o ON c.id = o.customer_id
      LEFT JOIN estimates e ON c.id = e.customer_id
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (customerType) {
      queryText += ` AND c.customer_type = $${paramIndex}`;
      queryParams.push(customerType);
      paramIndex++;
    }

    if (search) {
      queryText += ` AND (
        LOWER(c.first_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(c.last_name) LIKE LOWER($${paramIndex}) OR 
        LOWER(c.email) LIKE LOWER($${paramIndex}) OR 
        c.phone LIKE $${paramIndex}
      )`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    queryText += ' GROUP BY c.id ORDER BY c.created_at DESC';

    const result = await query(queryText, queryParams);

    // Format the customers
    const customers = result.rows.map(cust => ({
      ...cust,
      opportunity_count: parseInt(cust.opportunity_count),
      estimate_count: parseInt(cust.estimate_count),
      total_opportunity_value: parseFloat(cust.total_opportunity_value || 0)
    }));

    return NextResponse.json({
      success: true,
      data: {
        customers,
        total: customers.length
      }
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'FETCH_ERROR', 
          message: 'Failed to fetch customers' 
        } 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate new customer ID
    const customerId = `cust-${Date.now()}`;
    
    // Insert into database
    const result = await query(
      `INSERT INTO customers (
        id, first_name, last_name, email, phone, address,
        city, state, zip_code, customer_type, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        customerId,
        body.first_name,
        body.last_name,
        body.email,
        body.phone || '',
        body.address || '',
        body.city || '',
        body.state || '',
        body.zip_code || '',
        body.customer_type || 'residential',
        body.notes || ''
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    
    // Check for unique constraint violation
    if ((error as any).code === '23505') {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'DUPLICATE_EMAIL', 
            message: 'A customer with this email already exists' 
          } 
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'CREATE_ERROR', 
          message: 'Failed to create customer' 
        } 
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'MISSING_ID', 
            message: 'Customer ID is required' 
          } 
        },
        { status: 400 }
      );
    }
    
    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        updateFields.push(`${key} = $${paramIndex}`);
        updateValues.push(value);
        paramIndex++;
      }
    });
    
    // Add updated_at
    updateFields.push(`updated_at = $${paramIndex}`);
    updateValues.push(new Date());
    paramIndex++;
    
    // Add ID for WHERE clause
    updateValues.push(id);
    
    const queryText = `
      UPDATE customers 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await query(queryText, updateValues);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'NOT_FOUND', 
            message: 'Customer not found' 
          } 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'UPDATE_ERROR', 
          message: 'Failed to update customer' 
        } 
      },
      { status: 500 }
    );
  }
}