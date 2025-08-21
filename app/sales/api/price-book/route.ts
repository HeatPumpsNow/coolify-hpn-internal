import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { query } from '@/lib/database';
import { z } from 'zod';

const priceBookQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  transparency: z.enum(['none', 'partial', 'full']).optional(),
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
    const { category, search, page, limit, transparency } = priceBookQuerySchema.parse(params);

    // Build dynamic query
    let whereConditions = ['active_to IS NULL']; // Only active items
    let queryParams: any[] = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      whereConditions.push(`category = $${paramCount}`);
      queryParams.push(category);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(
        description ILIKE $${paramCount} OR 
        manufacturer ILIKE $${paramCount} OR 
        model ILIKE $${paramCount} OR
        sku ILIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
    }

    if (transparency) {
      paramCount++;
      whereConditions.push(`transparency_level = $${paramCount}`);
      queryParams.push(transparency);
    }

    const offset = (page - 1) * limit;
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM price_book_items 
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const itemsQuery = `
      SELECT 
        id, sku, manufacturer, model, description, category,
        cost, markup_percentage, current_price,
        labor_hours_standard, complexity_factor,
        transparency_level, customer_visible_description,
        specifications, version, created_at, updated_at
      FROM price_book_items 
      ${whereClause}
      ORDER BY category, manufacturer, model
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const itemsResult = await query(itemsQuery, queryParams);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        items: itemsResult.rows,
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
    console.error('Price book fetch error:', error);

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