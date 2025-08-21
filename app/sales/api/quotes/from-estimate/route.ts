import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  let client;
  try {
    client = await pool.connect();
    const body = await request.json();
    const {
      opportunity_id,
      estimate_id,
      quote_name,
      items,
      global_markup,
      group_markups,
      terms_template_id,
      terms_content,
      notes,
      valid_until
    } = body;

    // Validate required fields
    if (!opportunity_id || !estimate_id || !quote_name) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Missing required fields: opportunity_id, estimate_id, and quote_name are required' 
          } 
        },
        { status: 400 }
      );
    }
    
    // Items can be empty initially
    const quoteItems = items || [];

    // Generate quote number
    const quoteNumber = `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    // Calculate totals from items (ensure numeric values)
    const totalCost = quoteItems.reduce((sum: number, item: any) => sum + Number(item.cost || 0), 0);
    const totalSellingPrice = quoteItems.reduce((sum: number, item: any) => sum + Number(item.selling_price || 0), 0);
    const totalMargin = totalSellingPrice - totalCost;
    const marginPercentage = totalSellingPrice > 0 ? (totalMargin / totalSellingPrice) * 100 : 0;

    // Create the quote
    const insertQuery = `
      INSERT INTO quotes (
        id,
        quote_number,
        quote_name,
        opportunity_id,
        estimate_id,
        status,
        total_cost,
        total_selling_price,
        total_margin,
        margin_percentage,
        global_markup,
        group_markups,
        line_items,
        terms_template_id,
        terms_content,
        notes,
        valid_until,
        created_at,
        updated_at
      ) VALUES (
        'q-' || substr(md5(random()::text), 1, 10),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id, quote_number
    `;

    const values = [
      quoteNumber,
      quote_name,
      opportunity_id,
      estimate_id,
      'draft',
      totalCost,
      totalSellingPrice,
      totalMargin,
      marginPercentage,
      JSON.stringify(global_markup || {}),
      JSON.stringify(group_markups || []),
      JSON.stringify(quoteItems),
      terms_template_id,
      terms_content,
      JSON.stringify(notes || []),
      valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    ];

    const result = await client.query(insertQuery, values);
    
    if (result.rows.length === 0) {
      throw new Error('Failed to create quote');
    }

    const newQuote = result.rows[0];

    // Update opportunity with quote reference
    await client.query(
      'UPDATE opportunities SET quote_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newQuote.id, opportunity_id]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: newQuote.id,
        quote_number: newQuote.quote_number,
        message: 'Quote created successfully'
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Quote creation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: 'Failed to create quote',
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