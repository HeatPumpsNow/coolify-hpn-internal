import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get all categories with counts
    const categoriesQuery = `
      SELECT 
        category,
        COUNT(*) as item_count,
        AVG(current_price) as avg_price,
        MIN(current_price) as min_price,
        MAX(current_price) as max_price
      FROM price_book_items 
      WHERE active_to IS NULL
      GROUP BY category
      ORDER BY category
    `;

    const result = await query(categoriesQuery);

    return NextResponse.json({
      success: true,
      data: {
        categories: result.rows,
      },
    });
  } catch (error) {
    console.error('Categories fetch error:', error);
    
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}