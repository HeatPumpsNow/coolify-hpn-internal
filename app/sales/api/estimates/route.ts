import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customer_id');
    const opportunityId = searchParams.get('opportunity_id');
    const status = searchParams.get('status');

    // Build query based on filters
    let queryText = `
      SELECT 
        e.*,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        o.lead_number,
        o.stage as opportunity_stage
      FROM estimates e
      LEFT JOIN customers c ON e.customer_id = c.id
      LEFT JOIN opportunities o ON e.opportunity_id = o.id
      WHERE 1=1
    `;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (customerId) {
      queryText += ` AND e.customer_id = $${paramIndex}`;
      queryParams.push(customerId);
      paramIndex++;
    }

    if (opportunityId) {
      queryText += ` AND e.opportunity_id = $${paramIndex}`;
      queryParams.push(opportunityId);
      paramIndex++;
    }

    if (status) {
      queryText += ` AND e.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    queryText += ' ORDER BY e.created_at DESC';

    const result = await query(queryText, queryParams);

    // Format the estimates
    const estimates = result.rows.map(est => ({
      ...est,
      total_equipment_cost: parseFloat(est.total_equipment_cost),
      total_labor_cost: parseFloat(est.total_labor_cost),
      total_material_cost: parseFloat(est.total_material_cost),
      total_cost: parseFloat(est.total_cost),
      margin_percentage: parseFloat(est.margin_percentage),
      final_price: parseFloat(est.final_price)
    }));

    return NextResponse.json({
      success: true,
      data: {
        estimates,
        total: estimates.length
      }
    });
  } catch (error) {
    console.error('Error fetching estimates:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'FETCH_ERROR', 
          message: 'Failed to fetch estimates' 
        } 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Generate new estimate ID and number
    const estimateId = `est-${Date.now()}`;
    const estimateNumber = `EST-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    
    // Calculate total cost if not provided
    const totalCost = body.total_cost || 
      (parseFloat(body.total_equipment_cost || 0) + 
       parseFloat(body.total_labor_cost || 0) + 
       parseFloat(body.total_material_cost || 0));
    
    // Calculate final price based on margin
    const marginPercentage = parseFloat(body.margin_percentage || 30);
    const finalPrice = totalCost / (1 - marginPercentage / 100);
    
    // Insert into database
    const result = await query(
      `INSERT INTO estimates (
        id, estimate_number, opportunity_id, customer_id, project_name,
        status, total_equipment_cost, total_labor_cost, total_material_cost,
        total_cost, margin_percentage, final_price, equipment_details,
        labor_details, material_details, project_scope, installation_notes,
        warranty_terms, valid_until
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        estimateId,
        estimateNumber,
        body.opportunity_id,
        body.customer_id,
        body.project_name,
        body.status || 'draft',
        body.total_equipment_cost || 0,
        body.total_labor_cost || 0,
        body.total_material_cost || 0,
        totalCost,
        marginPercentage,
        finalPrice,
        JSON.stringify(body.equipment_details || {}),
        JSON.stringify(body.labor_details || {}),
        JSON.stringify(body.material_details || {}),
        body.project_scope || '',
        body.installation_notes || '',
        body.warranty_terms || '',
        body.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating estimate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'CREATE_ERROR', 
          message: 'Failed to create estimate' 
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
            message: 'Estimate ID is required' 
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
      UPDATE estimates 
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
            message: 'Estimate not found' 
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
    console.error('Error updating estimate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'UPDATE_ERROR', 
          message: 'Failed to update estimate' 
        } 
      },
      { status: 500 }
    );
  }
}