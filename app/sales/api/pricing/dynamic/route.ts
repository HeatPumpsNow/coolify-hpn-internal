import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/database';

// Dynamic Pricing Engine
// Calculates real-time pricing based on multiple factors

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      items, // Array of price book items
      customer_profile,
      project_details,
      quote_date,
      transparency_level = 'partial'
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items array is required' },
        { status: 400 }
      );
    }

    const db = getPool();

    // Get pricing rules and base prices
    const pricingData = await calculateDynamicPricing({
      db,
      items,
      customer_profile,
      project_details,
      quote_date: quote_date || new Date(),
      transparency_level
    });

    // Pool connections are managed automatically

    return NextResponse.json({
      success: true,
      data: pricingData
    });

  } catch (error) {
    console.error('Dynamic pricing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate dynamic pricing' },
      { status: 500 }
    );
  }
}

// GET /api/pricing/dynamic/rules - Get available pricing rules
export async function GET(request: NextRequest) {
  try {
    const db = getPool();

    const rulesQuery = `
      SELECT 
        id,
        rule_name,
        rule_type,
        conditions,
        adjustments,
        priority,
        active,
        valid_from,
        valid_until
      FROM pricing_rules
      WHERE active = true
        AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_until IS NULL OR valid_until >= CURRENT_DATE)
      ORDER BY priority ASC, rule_type
    `;

    const result = await db.query(rulesQuery);
    // Pool connections are managed automatically

    return NextResponse.json({
      success: true,
      data: {
        rules: result.rows,
        rule_types: [
          'geographic',
          'seasonal',
          'volume',
          'complexity',
          'customer_tier',
          'promotional',
          'competition'
        ]
      }
    });

  } catch (error) {
    console.error('Get pricing rules error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing rules' },
      { status: 500 }
    );
  }
}

// Core pricing calculation function
async function calculateDynamicPricing({
  db,
  items,
  customer_profile,
  project_details,
  quote_date,
  transparency_level
}: {
  db: any;
  items: any[];
  customer_profile?: any;
  project_details?: any;
  quote_date: Date;
  transparency_level: string;
}) {
  // 1. Get base pricing from price book
  const itemIds = items.map(item => item.id).filter(Boolean);
  
  const basePricingQuery = `
    SELECT 
      id,
      sku,
      manufacturer,
      model,
      description,
      category,
      cost,
      markup_percentage,
      current_price,
      labor_hours_standard,
      complexity_factor,
      transparency_level as item_transparency,
      customer_visible_description
    FROM price_book_items
    WHERE id = ANY($1)
  `;

  const basePricing = await db.query(basePricingQuery, [itemIds]);
  const priceBookItems = basePricing.rows.reduce((acc: any, item: any) => {
    acc[item.id] = item;
    return acc;
  }, {});

  // 2. Get applicable pricing rules
  const rulesQuery = `
    SELECT *
    FROM pricing_rules
    WHERE active = true
      AND (valid_from IS NULL OR valid_from <= $1)
      AND (valid_until IS NULL OR valid_until >= $1)
    ORDER BY priority ASC
  `;

  const rulesResult = await db.query(rulesQuery, [quote_date]);
  const pricingRules = rulesResult.rows;

  // 3. Calculate pricing for each item
  const pricedItems = items.map(requestItem => {
    const baseItem = priceBookItems[requestItem.id];
    if (!baseItem) {
      throw new Error(`Price book item not found: ${requestItem.id}`);
    }

    const quantity = requestItem.quantity || 1;
    
    // Start with base pricing
    let adjustedCost = parseFloat(baseItem.cost);
    let adjustedMarkup = parseFloat(baseItem.markup_percentage);
    let laborMultiplier = 1.0;
    let complexityMultiplier = parseFloat(baseItem.complexity_factor) || 1.0;

    // Applied adjustments for transparency
    const appliedAdjustments: any[] = [];

    // Apply pricing rules in priority order
    for (const rule of pricingRules) {
      const adjustment = applyPricingRule(rule, {
        item: baseItem,
        customer_profile,
        project_details,
        quote_date,
        current_adjustments: { adjustedCost, adjustedMarkup, laborMultiplier, complexityMultiplier }
      });

      if (adjustment.applied) {
        adjustedCost *= adjustment.cost_multiplier || 1;
        adjustedMarkup += adjustment.markup_adjustment || 0;
        laborMultiplier *= adjustment.labor_multiplier || 1;
        complexityMultiplier *= adjustment.complexity_multiplier || 1;

        appliedAdjustments.push({
          rule_name: rule.rule_name,
          rule_type: rule.rule_type,
          adjustment: adjustment,
          description: adjustment.description
        });
      }
    }

    // Calculate final pricing
    const finalUnitPrice = adjustedCost * (1 + adjustedMarkup / 100) * complexityMultiplier;
    const laborHours = (parseFloat(baseItem.labor_hours_standard) || 0) * quantity * laborMultiplier;
    const laborCost = laborHours * getLaborRate(customer_profile?.location);
    const totalItemPrice = (finalUnitPrice * quantity) + laborCost;

    // Transparency-based response
    const transparencyData = buildTransparencyData({
      transparency_level,
      baseItem,
      adjustedCost,
      adjustedMarkup,
      finalUnitPrice,
      laborHours,
      laborCost,
      appliedAdjustments
    });

    return {
      id: requestItem.id,
      sku: baseItem.sku,
      description: baseItem.customer_visible_description || baseItem.description,
      manufacturer: baseItem.manufacturer,
      model: baseItem.model,
      category: baseItem.category,
      quantity,
      
      // Pricing breakdown
      unit_price: finalUnitPrice,
      labor_hours: laborHours,
      labor_cost: laborCost,
      total_price: totalItemPrice,
      
      // Transparency data (varies by level)
      ...transparencyData,
      
      // Always include for sales rep
      internal_data: {
        base_cost: parseFloat(baseItem.cost),
        adjusted_cost: adjustedCost,
        base_markup: parseFloat(baseItem.markup_percentage),
        adjusted_markup: adjustedMarkup,
        applied_adjustments: appliedAdjustments,
        margin_amount: totalItemPrice - (adjustedCost * quantity) - laborCost,
        margin_percentage: ((totalItemPrice - (adjustedCost * quantity) - laborCost) / totalItemPrice) * 100
      }
    };
  });

  // 4. Calculate totals and project-level adjustments
  const subtotal = pricedItems.reduce((sum, item) => sum + item.total_price, 0);
  
  // Project-level adjustments (volume discounts, etc.)
  const projectAdjustments = calculateProjectAdjustments({
    subtotal,
    project_details,
    customer_profile,
    pricingRules
  });

  const adjustedSubtotal = subtotal * (1 + projectAdjustments.discount_percentage / 100);
  const taxRate = getTaxRate(customer_profile?.location) / 100;
  const taxAmount = adjustedSubtotal * taxRate;
  const totalAmount = adjustedSubtotal + taxAmount;

  return {
    items: pricedItems,
    pricing_summary: {
      subtotal,
      project_adjustments: projectAdjustments,
      adjusted_subtotal: adjustedSubtotal,
      tax_rate: taxRate * 100,
      tax_amount: taxAmount,
      total_amount: totalAmount
    },
    transparency_notes: buildTransparencyNotes(transparency_level, pricedItems),
    calculated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
  };
}

// Apply individual pricing rule
function applyPricingRule(rule: any, context: any): any {
  const { item, customer_profile, project_details, quote_date, current_adjustments } = context;
  const conditions = rule.conditions || {};
  const adjustments = rule.adjustments || {};

  // Check if rule conditions are met
  let conditionsMet = true;

  // Geographic conditions
  if (conditions.locations && customer_profile?.location) {
    conditionsMet = conditionsMet && conditions.locations.includes(customer_profile.location);
  }

  // Seasonal conditions
  if (conditions.seasons) {
    const month = quote_date.getMonth() + 1;
    const season = getSeason(month);
    conditionsMet = conditionsMet && conditions.seasons.includes(season);
  }

  // Category conditions
  if (conditions.categories) {
    conditionsMet = conditionsMet && conditions.categories.includes(item.category);
  }

  // Volume conditions
  if (conditions.min_quantity && project_details?.total_items) {
    conditionsMet = conditionsMet && project_details.total_items >= conditions.min_quantity;
  }

  // Customer tier conditions
  if (conditions.customer_tiers && customer_profile?.tier) {
    conditionsMet = conditionsMet && conditions.customer_tiers.includes(customer_profile.tier);
  }

  if (!conditionsMet) {
    return { applied: false };
  }

  // Apply adjustments
  return {
    applied: true,
    cost_multiplier: adjustments.cost_multiplier || 1,
    markup_adjustment: adjustments.markup_adjustment || 0,
    labor_multiplier: adjustments.labor_multiplier || 1,
    complexity_multiplier: adjustments.complexity_multiplier || 1,
    description: rule.description || `Applied ${rule.rule_name}`
  };
}

// Helper functions
function getLaborRate(location?: string): number {
  const baseRate = 85; // Base labor rate per hour
  const locationMultipliers: { [key: string]: number } = {
    'san_francisco': 1.4,
    'new_york': 1.3,
    'austin': 1.1,
    'denver': 1.0,
    'atlanta': 0.9,
    'dallas': 0.95
  };
  
  return baseRate * (locationMultipliers[location || 'default'] || 1.0);
}

function getTaxRate(location?: string): number {
  const taxRates: { [key: string]: number } = {
    'california': 8.5,
    'texas': 6.25,
    'new_york': 8.0,
    'florida': 6.0,
    'colorado': 7.65
  };
  
  return taxRates[location || 'default'] || 7.0;
}

function getSeason(month: number): string {
  if (month >= 12 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  return 'fall';
}

function calculateProjectAdjustments({ subtotal, project_details, customer_profile, pricingRules }: any) {
  let discount_percentage = 0;
  const applied_adjustments = [];

  // Volume discounts
  if (subtotal > 20000) {
    discount_percentage -= 5; // 5% discount for orders over $20k
    applied_adjustments.push('Volume discount (>$20k): 5%');
  } else if (subtotal > 10000) {
    discount_percentage -= 2.5; // 2.5% discount for orders over $10k
    applied_adjustments.push('Volume discount (>$10k): 2.5%');
  }

  // Customer loyalty discounts
  if (customer_profile?.is_repeat_customer) {
    discount_percentage -= 3;
    applied_adjustments.push('Repeat customer discount: 3%');
  }

  return {
    discount_percentage,
    applied_adjustments,
    description: applied_adjustments.join(', ')
  };
}

function buildTransparencyData({ transparency_level, baseItem, adjustedCost, adjustedMarkup, finalUnitPrice, laborHours, laborCost, appliedAdjustments }: any) {
  switch (transparency_level) {
    case 'full':
      return {
        transparency_data: {
          base_cost: parseFloat(baseItem.cost),
          adjusted_cost: adjustedCost,
          markup_percentage: adjustedMarkup,
          labor_breakdown: {
            hours: laborHours,
            rate_per_hour: laborCost / laborHours || 0,
            total_labor_cost: laborCost
          },
          applied_adjustments: appliedAdjustments,
          profit_margin: finalUnitPrice - adjustedCost
        }
      };
    
    case 'partial':
      return {
        transparency_data: {
          includes_labor: laborHours > 0,
          labor_hours: laborHours,
          value_breakdown: 'Equipment + Installation + Warranty',
          quality_assurance: 'Certified technicians, 2-year warranty'
        }
      };
    
    case 'none':
    default:
      return {};
  }
}

function buildTransparencyNotes(transparency_level: string, pricedItems: any[]): string[] {
  const notes = [];
  
  if (transparency_level === 'full') {
    notes.push('Complete cost breakdown provided for your transparency');
    notes.push('All pricing adjustments and their reasons are shown');
    notes.push('Labor rates reflect certified technician expertise');
  } else if (transparency_level === 'partial') {
    notes.push('Pricing includes equipment, professional installation, and warranty');
    notes.push('All work performed by certified HVAC technicians');
  }
  
  notes.push('Prices valid for 7 days from quote date');
  notes.push('All installations include 2-year warranty on workmanship');
  
  return notes;
}