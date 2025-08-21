import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/database';
import { z } from 'zod';

const quotesQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
});

const createQuoteSchema = z.object({
  lead_id: z.string().uuid('Valid lead ID is required'),
  quote_name: z.string().min(1, 'Quote name is required'),
  items: z.array(z.object({
    price_book_item_id: z.string().uuid(),
    quantity: z.number().min(1),
    custom_price: z.number().optional(),
    notes: z.string().optional(),
  })).min(1, 'At least one item is required'),
  labor_hours: z.number().min(0).default(0),
  complexity_multiplier: z.number().min(1).default(1),
  discount_percentage: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  valid_until: z.string().optional(),
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
    const { status, search, page, limit } = quotesQuerySchema.parse(params);

    // Build dynamic query
    let whereConditions = [];
    let queryParams: any[] = [];
    let paramCount = 0;

    // Filter by sales rep (for non-managers)
    if (user.role === 'sales_rep') {
      paramCount++;
      whereConditions.push(`p.sales_rep_id = $${paramCount}`);
      queryParams.push(user.id);
    }

    if (status) {
      paramCount++;
      whereConditions.push(`p.status = $${paramCount}`);
      queryParams.push(status);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(
        p.quote_number ILIKE $${paramCount} OR 
        p.quote_name ILIKE $${paramCount} OR
        l.customer_info->>'first_name' ILIKE $${paramCount} OR
        l.customer_info->>'last_name' ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    const offset = (page - 1) * limit;
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM proposals p LEFT JOIN sales_leads l ON p.lead_id = l.id ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results with lead info
    const quotesQuery = `
      SELECT 
        p.id, p.quote_number, p.quote_name, p.status, p.total_amount,
        p.discount_percentage, p.labor_cost, p.equipment_cost, p.margin_amount,
        p.created_at, p.updated_at, p.valid_until,
        l.customer_info, l.lead_number,
        sr.first_name as rep_first_name, sr.last_name as rep_last_name
      FROM proposals p
      LEFT JOIN sales_leads l ON p.lead_id = l.id
      LEFT JOIN sales_reps sr ON p.sales_rep_id = sr.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const quotesResult = await query(quotesQuery, queryParams);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        quotes: quotesResult.rows,
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
    console.error('Quotes fetch error:', error);

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
    const quoteData = createQuoteSchema.parse(body);

    // Generate quote number
    const quoteNumber = `QTE-${Date.now()}`;

    // Get price book items for calculation
    const itemIds = quoteData.items.map(item => item.price_book_item_id);
    const itemsQuery = `
      SELECT id, sku, current_price, labor_hours_standard, complexity_factor
      FROM price_book_items 
      WHERE id = ANY($1)
    `;
    const itemsResult = await query(itemsQuery, [itemIds]);
    const priceBookItems = itemsResult.rows;

    // Calculate totals
    let equipmentCost = 0;
    let totalLaborHours = quoteData.labor_hours;

    const quotedItems = quoteData.items.map(quotedItem => {
      const priceBookItem = priceBookItems.find(item => item.id === quotedItem.price_book_item_id);
      if (!priceBookItem) {
        throw new Error(`Price book item ${quotedItem.price_book_item_id} not found`);
      }

      const unitPrice = quotedItem.custom_price || priceBookItem.current_price;
      const lineTotal = unitPrice * quotedItem.quantity;
      equipmentCost += lineTotal;
      totalLaborHours += (priceBookItem.labor_hours_standard * quotedItem.quantity * priceBookItem.complexity_factor);

      return {
        price_book_item_id: quotedItem.price_book_item_id,
        sku: priceBookItem.sku,
        quantity: quotedItem.quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
        notes: quotedItem.notes || '',
      };
    });

    // Calculate labor cost (assuming $85/hour average)
    const laborRate = 85.0;
    const adjustedLaborHours = totalLaborHours * quoteData.complexity_multiplier;
    const laborCost = adjustedLaborHours * laborRate;

    // Calculate totals
    const subtotal = equipmentCost + laborCost;
    const discountAmount = (subtotal * quoteData.discount_percentage) / 100;
    const totalAmount = subtotal - discountAmount;

    // Calculate margin (assuming 35% target margin)
    const marginAmount = totalAmount * 0.35;

    // Set valid until date (30 days from now if not specified)
    const validUntil = quoteData.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Create quote in database
    const insertQuoteQuery = `
      INSERT INTO proposals (
        quote_number, quote_name, lead_id, sales_rep_id, status,
        equipment_cost, labor_cost, total_amount, discount_percentage, margin_amount,
        labor_hours, complexity_multiplier, notes, valid_until, quoted_items
      ) VALUES (
        $1, $2, $3, $4, 'draft',
        $5, $6, $7, $8, $9,
        $10, $11, $12, $13, $14
      ) RETURNING id, created_at
    `;

    const result = await query(insertQuoteQuery, [
      quoteNumber,
      quoteData.quote_name,
      quoteData.lead_id,
      user.id,
      equipmentCost,
      laborCost,
      totalAmount,
      quoteData.discount_percentage,
      marginAmount,
      adjustedLaborHours,
      quoteData.complexity_multiplier,
      quoteData.notes || '',
      validUntil,
      JSON.stringify(quotedItems),
    ]);

    const newQuote = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: newQuote.id,
        quote_number: quoteNumber,
        message: 'Quote created successfully',
        totals: {
          equipment_cost: equipmentCost,
          labor_cost: laborCost,
          subtotal: subtotal,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          margin_amount: marginAmount,
        },
        created_at: newQuote.created_at,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Quote creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid quote data',
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