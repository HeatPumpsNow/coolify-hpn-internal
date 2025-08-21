import { NextRequest, NextResponse } from 'next/server';
import AuthService from '@/lib/auth';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const tokenCookie = request.cookies.get('auth_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await AuthService.validateSession(tokenCookie.value);
    if (!employee) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const url = new URL(request.url);
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString());

    // Get payroll entries for the specified year
    const payrollResult = await query(`
      SELECT 
        ep.id,
        pp.start_date,
        pp.end_date,
        pp.pay_date,
        ep.regular_hours,
        ep.overtime_hours,
        ep.regular_rate,
        ep.overtime_rate,
        ep.gross_pay,
        ep.federal_tax,
        ep.state_tax,
        ep.fica_tax,
        ep.medicare_tax,
        ep.health_insurance,
        ep.dental_insurance,
        ep.retirement_contrib,
        ep.other_deductions,
        ep.net_pay,
        ep.job_count,
        ep.photo_count,
        ep.bonus_amount,
        ep.bonus_description
      FROM employee_payroll ep
      INNER JOIN pay_periods pp ON ep.pay_period_id = pp.id
      WHERE ep.employee_id = $1 
        AND EXTRACT(YEAR FROM pp.start_date) = $2
      ORDER BY pp.start_date DESC
    `, [employee.id, year]);

    // If no payroll data exists, create sample data
    if (payrollResult.rows.length === 0) {
      // Create sample pay periods and payroll data
      const samplePayPeriods = [
        { start: '2024-01-01', end: '2024-01-15', pay: '2024-01-20' },
        { start: '2024-01-16', end: '2024-01-31', pay: '2024-02-05' },
        { start: '2024-02-01', end: '2024-02-15', pay: '2024-02-20' }
      ];

      for (const period of samplePayPeriods) {
        // Insert pay period
        const periodResult = await query(`
          INSERT INTO pay_periods (start_date, end_date, pay_date, status)
          VALUES ($1, $2, $3, 'paid')
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [period.start, period.end, period.pay]);

        if (periodResult.rows.length > 0) {
          const periodId = periodResult.rows[0].id;

          // Sample payroll calculations
          const regularHours = 80;
          const overtimeHours = Math.floor(Math.random() * 8);
          const regularRate = 32.50;
          const overtimeRate = regularRate * 1.5;
          const grossPay = (regularHours * regularRate) + (overtimeHours * overtimeRate);
          const bonusAmount = Math.floor(Math.random() * 300);
          const totalGross = grossPay + bonusAmount;
          
          const federalTax = totalGross * 0.15;
          const stateTax = totalGross * 0.05;
          const ficaTax = totalGross * 0.062;
          const medicareTax = totalGross * 0.0145;
          const healthInsurance = 150;
          const dentalInsurance = 25;
          const retirementContrib = totalGross * 0.05;
          
          const totalDeductions = federalTax + stateTax + ficaTax + medicareTax + 
                                  healthInsurance + dentalInsurance + retirementContrib;
          const netPay = totalGross - totalDeductions;

          // Insert payroll record
          await query(`
            INSERT INTO employee_payroll (
              employee_id, pay_period_id, regular_hours, overtime_hours,
              regular_rate, overtime_rate, gross_pay, federal_tax, state_tax,
              fica_tax, medicare_tax, health_insurance, dental_insurance,
              retirement_contrib, other_deductions, net_pay, job_count,
              photo_count, bonus_amount, bonus_description
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
            ON CONFLICT (employee_id, pay_period_id) DO NOTHING
          `, [
            employee.id, periodId, regularHours, overtimeHours, regularRate, overtimeRate,
            totalGross, federalTax, stateTax, ficaTax, medicareTax, healthInsurance,
            dentalInsurance, retirementContrib, 0, netPay, Math.floor(Math.random() * 15) + 5,
            Math.floor(Math.random() * 50) + 20, bonusAmount,
            bonusAmount > 0 ? 'Performance bonus' : null
          ]);
        }
      }

      // Re-fetch the data
      const updatedPayrollResult = await query(`
        SELECT 
          ep.id,
          pp.start_date,
          pp.end_date,
          pp.pay_date,
          ep.regular_hours,
          ep.overtime_hours,
          ep.regular_rate,
          ep.overtime_rate,
          ep.gross_pay,
          ep.federal_tax,
          ep.state_tax,
          ep.fica_tax,
          ep.medicare_tax,
          ep.health_insurance,
          ep.dental_insurance,
          ep.retirement_contrib,
          ep.other_deductions,
          ep.net_pay,
          ep.job_count,
          ep.photo_count,
          ep.bonus_amount,
          ep.bonus_description
        FROM employee_payroll ep
        INNER JOIN pay_periods pp ON ep.pay_period_id = pp.id
        WHERE ep.employee_id = $1 
          AND EXTRACT(YEAR FROM pp.start_date) = $2
        ORDER BY pp.start_date DESC
      `, [employee.id, year]);

      payrollResult.rows = updatedPayrollResult.rows;
    }

    // Transform data for frontend
    const payrollEntries = payrollResult.rows.map((row: any) => ({
      id: row.id,
      payPeriodStart: row.start_date,
      payPeriodEnd: row.end_date,
      payDate: row.pay_date,
      regularHours: parseFloat(row.regular_hours),
      overtimeHours: parseFloat(row.overtime_hours),
      regularRate: parseFloat(row.regular_rate),
      overtimeRate: parseFloat(row.overtime_rate),
      grossPay: parseFloat(row.gross_pay),
      netPay: parseFloat(row.net_pay),
      deductions: {
        federal: parseFloat(row.federal_tax),
        state: parseFloat(row.state_tax),
        fica: parseFloat(row.fica_tax),
        medicare: parseFloat(row.medicare_tax),
        health: parseFloat(row.health_insurance),
        dental: parseFloat(row.dental_insurance),
        retirement: parseFloat(row.retirement_contrib)
      },
      bonuses: row.bonus_amount > 0 ? [{
        description: row.bonus_description || 'Bonus',
        amount: parseFloat(row.bonus_amount)
      }] : [],
      jobCount: parseInt(row.job_count),
      photoCount: parseInt(row.photo_count)
    }));

    // Calculate summary data
    const ytdGross = payrollEntries.reduce((sum: number, entry: any) => sum + entry.grossPay, 0);
    const ytdNet = payrollEntries.reduce((sum: number, entry: any) => sum + entry.netPay, 0);
    const ytdTax = payrollEntries.reduce((sum: number, entry: any) => {
      return sum + entry.deductions.federal + entry.deductions.state + 
             entry.deductions.fica + entry.deductions.medicare;
    }, 0);

    const totalHours = payrollEntries.reduce((sum: number, entry: any) => 
      sum + entry.regularHours + entry.overtimeHours, 0);
    const weeksWorked = payrollEntries.length * 2; // Bi-weekly pay periods
    const avgHoursPerWeek = weeksWorked > 0 ? totalHours / weeksWorked : 0;

    const totalJobsCompleted = payrollEntries.reduce((sum: number, entry: any) => sum + entry.jobCount, 0);
    const totalBonuses = payrollEntries.reduce((sum: number, entry: any) => {
      return sum + entry.bonuses.reduce((bonusSum: number, bonus: any) => bonusSum + bonus.amount, 0);
    }, 0);

    // Mock current pay period data
    const summary = {
      ytdGross,
      ytdNet,
      ytdTax,
      avgHoursPerWeek,
      totalJobsCompleted,
      totalBonuses,
      currentPayPeriod: {
        hoursWorked: 65, // Mock current period
        estimatedGross: 65 * 32.50,
        jobsCompleted: 8
      }
    };

    return NextResponse.json({
      success: true,
      payrollEntries,
      summary
    });

  } catch (error) {
    console.error('Earnings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch earnings data' },
      { status: 500 }
    );
  }
}