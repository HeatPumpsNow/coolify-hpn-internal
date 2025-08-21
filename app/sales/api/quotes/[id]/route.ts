import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/database';
import pool from '@/lib/db';
import { z } from 'zod';

const updateQuoteSchema = z.object({
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional(),
  quote_name: z.string().min(1).optional(),
  notes: z.string().optional(),
  discount_percentage: z.number().min(0).max(100).optional(),
  valid_until: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // For development, skip auth check
    // const user = await getAuthUser(request);
    // 
    // if (!user) {
    //   return NextResponse.json(
    //     { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
    //     { status: 401 }
    //   );
    // }

    const quoteId = params.id;

    const quoteQuery = `
      SELECT 
        q.id, q.quote_number, q.quote_name, q.status, 
        q.total_cost, q.total_selling_price, q.total_margin, q.margin_percentage,
        q.global_markup, q.group_markups, q.line_items,
        q.terms_template_id, q.terms_content, q.notes,
        q.created_at, q.updated_at, q.valid_until,
        q.opportunity_id, q.estimate_id,
        o.customer_id, o.lead_number, o.value as opportunity_value,
        c.first_name as customer_first_name, c.last_name as customer_last_name, 
        c.email as customer_email, c.phone as customer_phone
      FROM quotes q
      LEFT JOIN opportunities o ON q.opportunity_id = o.id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE q.id = $1
    `;

    const result = await query(quoteQuery, [quoteId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Quote not found' } },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const quote = {
      id: row.id,
      quote_number: row.quote_number,
      quote_name: row.quote_name,
      status: row.status,
      total_cost: parseFloat(row.total_cost || 0),
      total_selling_price: parseFloat(row.total_selling_price || 0),
      total_margin: parseFloat(row.total_margin || 0),
      margin_percentage: parseFloat(row.margin_percentage || 0),
      global_markup: typeof row.global_markup === 'string' ? JSON.parse(row.global_markup) : row.global_markup,
      group_markups: typeof row.group_markups === 'string' ? JSON.parse(row.group_markups) : row.group_markups,
      line_items: typeof row.line_items === 'string' ? JSON.parse(row.line_items) : row.line_items,
      terms_template_id: row.terms_template_id,
      terms_content: row.terms_content,
      notes: typeof row.notes === 'string' ? JSON.parse(row.notes) : row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      valid_until: row.valid_until,
      opportunity_id: row.opportunity_id,
      estimate_id: row.estimate_id,
      customer_info: {
        name: `${row.customer_first_name} ${row.customer_last_name}`,
        email: row.customer_email,
        phone: row.customer_phone,
      },
      lead_number: row.lead_number,
    };

    return NextResponse.json({
      success: true,
      data: { quote },
    });
  } catch (error) {
    console.error('Quote fetch error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}

// PUT method for updating quotes table (our new table)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let client;
  try {
    client = await pool.connect();
    const quoteId = params.id;
    const body = await request.json();
    
    const {
      quote_name,
      items,
      global_markup,
      group_markups,
      terms_template_id,
      terms_content,
      notes,
      valid_until
    } = body;
    
    // Calculate totals from items (ensure numeric values)
    const totalCost = items?.reduce((sum: number, item: any) => sum + Number(item.cost || 0), 0) || 0;
    const totalSellingPrice = items?.reduce((sum: number, item: any) => sum + Number(item.selling_price || 0), 0) || 0;
    const totalMargin = totalSellingPrice - totalCost;
    const marginPercentage = totalSellingPrice > 0 ? (totalMargin / totalSellingPrice) * 100 : 0;
    
    const updateQuery = `
      UPDATE quotes SET
        quote_name = $2,
        total_cost = $3,
        total_selling_price = $4,
        total_margin = $5,
        margin_percentage = $6,
        global_markup = $7,
        group_markups = $8,
        line_items = $9,
        terms_template_id = $10,
        terms_content = $11,
        notes = $12,
        valid_until = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, quote_number, updated_at
    `;
    
    const values = [
      quoteId,
      quote_name,
      totalCost,
      totalSellingPrice,
      totalMargin,
      marginPercentage,
      JSON.stringify(global_markup),
      JSON.stringify(group_markups || []),
      JSON.stringify(items),
      terms_template_id,
      terms_content,
      JSON.stringify(notes || []),
      valid_until
    ];
    
    const result = await client.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Quote not found' } },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        quote_number: result.rows[0].quote_number,
        updated_at: result.rows[0].updated_at,
        message: 'Quote updated successfully'
      }
    });
  } catch (error) {
    console.error('Quote update error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: 'Failed to update quote',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // For development, skip auth check
    // const user = await getAuthUser(request);
    // 
    // if (!user) {
    //   return NextResponse.json(
    //     { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
    //     { status: 401 }
    //   );
    // }

    const quoteId = params.id;
    const body = await request.json();
    const updateData = updateQuoteSchema.parse(body);

    // Check if quote exists
    let whereCondition = 'id = $1';
    let queryParams: any[] = [quoteId];

    const existingQuoteResult = await query(
      `SELECT id, status FROM proposals WHERE ${whereCondition}`,
      queryParams
    );

    if (existingQuoteResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Quote not found or access denied' } },
        { status: 404 }
      );
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 0;

    if (updateData.status !== undefined) {
      paramCount++;
      updateFields.push(`status = $${paramCount}`);
      updateValues.push(updateData.status);
    }

    if (updateData.quote_name !== undefined) {
      paramCount++;
      updateFields.push(`quote_name = $${paramCount}`);
      updateValues.push(updateData.quote_name);
    }

    if (updateData.notes !== undefined) {
      paramCount++;
      updateFields.push(`notes = $${paramCount}`);
      updateValues.push(updateData.notes);
    }

    if (updateData.discount_percentage !== undefined) {
      paramCount++;
      updateFields.push(`discount_percentage = $${paramCount}`);
      updateValues.push(updateData.discount_percentage);
    }

    if (updateData.valid_until !== undefined) {
      paramCount++;
      updateFields.push(`valid_until = $${paramCount}`);
      updateValues.push(updateData.valid_until);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' } },
        { status: 400 }
      );
    }

    // Add updated_at and quote ID
    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    updateValues.push(new Date().toISOString());
    
    paramCount++;
    updateValues.push(quoteId);

    const updateQuery = `
      UPDATE proposals 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, quote_number, status, updated_at
    `;

    const result = await query(updateQuery, updateValues);

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        quote_number: result.rows[0].quote_number,
        status: result.rows[0].status,
        updated_at: result.rows[0].updated_at,
        message: 'Quote updated successfully',
      },
    });

  } catch (error) {
    console.error('Quote update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid update data',
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // For development, skip auth check
    // const user = await getAuthUser(request);
    // 
    // if (!user) {
    //   return NextResponse.json(
    //     { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
    //     { status: 401 }
    //   );
    // }

    const quoteId = params.id;

    // Check if quote exists
    let whereCondition = 'id = $1';
    let queryParams: any[] = [quoteId];

    const existingQuoteResult = await query(
      `SELECT id, quote_number, status FROM proposals WHERE ${whereCondition}`,
      queryParams
    );

    if (existingQuoteResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Quote not found or access denied' } },
        { status: 404 }
      );
    }

    const quote = existingQuoteResult.rows[0];

    // Only allow deletion of draft quotes
    if (quote.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only draft quotes can be deleted' } },
        { status: 403 }
      );
    }

    // Delete the quote
    await query('DELETE FROM proposals WHERE id = $1', [quoteId]);

    return NextResponse.json({
      success: true,
      data: {
        message: `Quote ${quote.quote_number} deleted successfully`,
      },
    });

  } catch (error) {
    console.error('Quote deletion error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}