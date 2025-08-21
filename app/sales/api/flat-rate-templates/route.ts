import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { query } from '@/lib/database';
import { z } from 'zod';

const flatRateTemplatesQuerySchema = z.object({
  quote_type: z.string().optional(),
  complexity_level: z.string().optional(),
  active: z.string().optional().transform(val => val === 'true'),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
});

const createFlatRateTemplateSchema = z.object({
  template_name: z.string().min(1, 'Template name is required'),
  template_description: z.string().optional(),
  quote_type: z.string().min(1, 'Quote type is required'),
  system_size_category: z.string().optional(),
  complexity_level: z.enum(['simple', 'standard', 'complex', 'high_risk']).default('standard'),
  template_phases: z.array(z.object({
    phase_name: z.string(),
    phase_type: z.string(),
    display_order: z.number(),
    complexity_multiplier: z.number().optional(),
    risk_factor_percentage: z.number().optional(),
    line_items: z.array(z.object({
      item_name: z.string(),
      sku: z.string().optional(),
      description: z.string(),
      quantity: z.number(),
      unit_cost: z.number(),
      unit_price: z.number(),
      labor_hours_per_unit: z.number().optional(),
      labor_rate: z.number().optional(),
      labor_complexity_factor: z.number().optional()
    }))
  })),
  worst_case_labor_hours: z.number().min(0),
  worst_case_total_cost: z.number().min(0),
  safety_margin_percentage: z.number().min(5).max(50).default(20),
  default_overhead_percentage: z.number().min(0).max(50).default(15),
  default_risk_buffer: z.number().min(0).max(25).default(10)
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
    const { quote_type, complexity_level, active, page, limit } = flatRateTemplatesQuerySchema.parse(params);

    // Build dynamic query
    let whereConditions = ['1=1']; // Always true base condition
    let queryParams: any[] = [];
    let paramCount = 0;

    if (quote_type) {
      paramCount++;
      whereConditions.push(`quote_type = $${paramCount}`);
      queryParams.push(quote_type);
    }

    if (complexity_level) {
      paramCount++;
      whereConditions.push(`complexity_level = $${paramCount}`);
      queryParams.push(complexity_level);
    }

    if (active !== undefined) {
      paramCount++;
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(active);
    } else {
      // Default to active templates only
      paramCount++;
      whereConditions.push(`active = $${paramCount}`);
      queryParams.push(true);
    }

    const offset = (page - 1) * limit;
    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM flat_rate_templates WHERE ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated results
    const templatesQuery = `
      SELECT 
        id, template_name, template_description, quote_type, 
        system_size_category, complexity_level,
        worst_case_labor_hours, worst_case_total_cost, safety_margin_percentage,
        default_overhead_percentage, default_risk_buffer,
        version, active, is_default,
        created_by, created_at, updated_at,
        approved_by, approved_at,
        sr.first_name as creator_first_name, sr.last_name as creator_last_name,
        sr2.first_name as approver_first_name, sr2.last_name as approver_last_name
      FROM flat_rate_templates frt
      LEFT JOIN sales_reps sr ON frt.created_by = sr.id
      LEFT JOIN sales_reps sr2 ON frt.approved_by = sr2.id
      WHERE ${whereClause}
      ORDER BY 
        CASE WHEN is_default THEN 0 ELSE 1 END,
        complexity_level,
        template_name
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);
    const templatesResult = await query(templatesQuery, queryParams);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return NextResponse.json({
      success: true,
      data: {
        templates: templatesResult.rows,
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
    console.error('Flat rate templates fetch error:', error);

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

    // Only allow managers and admins to create flat rate templates
    if (!['sales_manager', 'sales_admin'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions to create flat rate templates' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const templateData = createFlatRateTemplateSchema.parse(body);

    // Check for duplicate template name
    const duplicateQuery = `
      SELECT id FROM flat_rate_templates 
      WHERE template_name = $1 AND active = TRUE
    `;
    const duplicateResult = await query(duplicateQuery, [templateData.template_name]);

    if (duplicateResult.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_TEMPLATE', message: 'Template name already exists' } },
        { status: 400 }
      );
    }

    // Validate template structure
    const totalLineItems = templateData.template_phases.reduce((sum, phase) => 
      sum + phase.line_items.length, 0
    );

    if (totalLineItems === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'EMPTY_TEMPLATE', message: 'Template must contain at least one line item' } },
        { status: 400 }
      );
    }

    // Calculate validation totals
    const calculatedTotal = templateData.template_phases.reduce((phaseSum, phase) => 
      phaseSum + phase.line_items.reduce((itemSum, item) => 
        itemSum + (item.unit_price * item.quantity) + 
        ((item.labor_hours_per_unit || 0) * item.quantity * (item.labor_rate || 85) * (item.labor_complexity_factor || 1)),
        0
      ), 0
    );

    // Warn if worst case total seems inconsistent
    if (Math.abs(calculatedTotal - templateData.worst_case_total_cost) > (calculatedTotal * 0.1)) {
      console.warn(`Flat rate template total mismatch: calculated ${calculatedTotal}, provided ${templateData.worst_case_total_cost}`);
    }

    // Create template
    const insertQuery = `
      INSERT INTO flat_rate_templates (
        template_name, template_description, quote_type, system_size_category,
        complexity_level, template_phases, template_line_items,
        worst_case_labor_hours, worst_case_total_cost, safety_margin_percentage,
        default_overhead_percentage, default_risk_buffer,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    // Flatten line items for the template_line_items field
    const flattenedLineItems = templateData.template_phases.flatMap(phase =>
      phase.line_items.map(item => ({
        ...item,
        phase_name: phase.phase_name,
        phase_type: phase.phase_type
      }))
    );

    const result = await query(insertQuery, [
      templateData.template_name,
      templateData.template_description || null,
      templateData.quote_type,
      templateData.system_size_category || null,
      templateData.complexity_level,
      JSON.stringify(templateData.template_phases),
      JSON.stringify(flattenedLineItems),
      templateData.worst_case_labor_hours,
      templateData.worst_case_total_cost,
      templateData.safety_margin_percentage,
      templateData.default_overhead_percentage,
      templateData.default_risk_buffer,
      user.id
    ]);

    const newTemplate = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        template: {
          ...newTemplate,
          template_phases: JSON.parse(newTemplate.template_phases),
          template_line_items: JSON.parse(newTemplate.template_line_items)
        },
        message: 'Flat rate template created successfully',
        validation: {
          total_phases: templateData.template_phases.length,
          total_line_items: totalLineItems,
          calculated_total: calculatedTotal,
          provided_total: templateData.worst_case_total_cost
        }
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Flat rate template creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid template data',
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