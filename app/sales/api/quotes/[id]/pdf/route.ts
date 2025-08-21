import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/database';
import { generateProposalHTML, defaultCompanyInfo } from '@/lib/pdf-generator';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const quoteId = params.id;

    // Build query with role-based filtering
    let whereCondition = 'p.id = $1';
    let queryParams: any[] = [quoteId];
    
    // Filter by sales rep for non-managers
    if (user.role === 'sales_rep') {
      whereCondition += ' AND p.sales_rep_id = $2';
      queryParams.push(user.id);
    }

    const quoteQuery = `
      SELECT 
        p.id, p.quote_number, p.quote_name, p.status, p.total_amount,
        p.discount_percentage, p.labor_cost, p.equipment_cost, p.margin_amount,
        p.labor_hours, p.complexity_multiplier, p.notes,
        p.created_at, p.updated_at, p.valid_until, p.quoted_items,
        l.id as lead_id, l.lead_number, l.customer_info,
        sr.first_name as rep_first_name, sr.last_name as rep_last_name, sr.email as rep_email
      FROM proposals p
      LEFT JOIN sales_leads l ON p.lead_id = l.id
      LEFT JOIN sales_reps sr ON p.sales_rep_id = sr.id
      WHERE ${whereCondition}
    `;

    const result = await query(quoteQuery, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Quote not found' } },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const customerInfo = typeof row.customer_info === 'string' ? JSON.parse(row.customer_info) : row.customer_info;
    const quotedItems = typeof row.quoted_items === 'string' ? JSON.parse(row.quoted_items) : row.quoted_items;

    // Prepare data for PDF generation
    const proposalData = {
      quote: {
        id: row.id,
        quote_number: row.quote_number,
        quote_name: row.quote_name,
        status: row.status,
        total_amount: parseFloat(row.total_amount),
        discount_percentage: parseFloat(row.discount_percentage),
        labor_cost: parseFloat(row.labor_cost),
        equipment_cost: parseFloat(row.equipment_cost),
        margin_amount: parseFloat(row.margin_amount),
        labor_hours: parseFloat(row.labor_hours),
        complexity_multiplier: parseFloat(row.complexity_multiplier),
        notes: row.notes || '',
        created_at: row.created_at,
        updated_at: row.updated_at,
        valid_until: row.valid_until,
        quoted_items: quotedItems,
      },
      customer: customerInfo,
      sales_rep: {
        first_name: row.rep_first_name,
        last_name: row.rep_last_name,
        email: row.rep_email,
      },
      company: defaultCompanyInfo,
    };

    // Generate HTML
    const htmlContent = generateProposalHTML(proposalData);

    // Check if we want to return HTML or try to generate PDF
    const format = request.nextUrl.searchParams.get('format');
    
    if (format === 'html') {
      // Return HTML for preview/debugging
      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    // For now, return a JSON response with HTML content
    // In a production environment, you would use a library like Puppeteer or similar to generate actual PDFs
    return NextResponse.json({
      success: true,
      data: {
        quote_number: row.quote_number,
        customer_name: `${customerInfo.first_name} ${customerInfo.last_name}`,
        html_content: htmlContent,
        message: 'PDF generation feature coming soon. For now, you can print this HTML to PDF using your browser.',
        print_url: `/api/quotes/${quoteId}/pdf?format=html`,
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}