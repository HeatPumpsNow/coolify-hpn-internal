import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyOwnerToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Authenticate owner
    const tokenCookie = request.cookies.get('owner_token');
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const payload = verifyOwnerToken(tokenCookie.value);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get owner from database
    const ownerResult = await pool.query('SELECT * FROM owners WHERE id = $1', [payload.ownerId]);
    if (ownerResult.rows.length === 0) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 401 });
    }
    
    const owner = ownerResult.rows[0];

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '12months';

    // Generate mock financial data for demonstration
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Generate monthly trend data based on period
    const getMonthlyTrend = () => {
      const months = [];
      let numMonths = 12;
      
      switch (period) {
        case '7days': numMonths = 1; break;
        case '30days': numMonths = 1; break;
        case '3months': numMonths = 3; break;
        case '12months': 
        default: numMonths = 12; break;
      }

      for (let i = numMonths - 1; i >= 0; i--) {
        const monthDate = new Date(currentYear, currentMonth - i, 1);
        const baseRevenue = 85000 + (Math.random() * 40000);
        const jobsCount = Math.floor(25 + (Math.random() * 15));
        
        months.push({
          month: monthDate.toISOString(),
          revenue: baseRevenue,
          jobsCount: jobsCount,
          averageJobValue: baseRevenue / jobsCount
        });
      }
      
      return months;
    };

    const monthlyTrend = getMonthlyTrend();
    const totalRevenue = monthlyTrend.reduce((sum, month) => sum + month.revenue, 0);
    const totalJobs = monthlyTrend.reduce((sum, month) => sum + month.jobsCount, 0);
    const avgJobValue = totalRevenue / totalJobs;

    // Mock financial summary
    const totalExpenses = totalRevenue * 0.75; // 75% expense ratio
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = (netProfit / totalRevenue) * 100;
    const revenueGrowth = 12.5; // Mock 12.5% growth

    const financialSummary = {
      totalRevenue: totalRevenue,
      revenueGrowth: revenueGrowth,
      totalExpenses: totalExpenses,
      netProfit: netProfit,
      profitMargin: profitMargin,
      completedJobs: totalJobs,
      averageJobValue: avgJobValue,
      recentRevenue: monthlyTrend[monthlyTrend.length - 1]?.revenue || 0
    };

    // Mock service type breakdown
    const serviceTypeBreakdown = [
      {
        serviceType: 'Heat Pump Installation',
        revenue: totalRevenue * 0.45,
        jobsCount: Math.floor(totalJobs * 0.35),
        averageValue: 8500
      },
      {
        serviceType: 'Maintenance & Repair',
        revenue: totalRevenue * 0.25,
        jobsCount: Math.floor(totalJobs * 0.40),
        averageValue: 350
      },
      {
        serviceType: 'System Upgrade',
        revenue: totalRevenue * 0.20,
        jobsCount: Math.floor(totalJobs * 0.15),
        averageValue: 6200
      },
      {
        serviceType: 'Emergency Service',
        revenue: totalRevenue * 0.10,
        jobsCount: Math.floor(totalJobs * 0.10),
        averageValue: 750
      }
    ];

    // Mock employee revenue data
    const employeeRevenue = [
      {
        id: 'emp-001',
        name: 'Mike Johnson',
        role: 'Senior Technician',
        revenue: totalRevenue * 0.30,
        jobsCompleted: Math.floor(totalJobs * 0.25),
        averageJobValue: 4200,
        averageRating: '4.8'
      },
      {
        id: 'emp-002',
        name: 'Sarah Williams',
        role: 'Lead Installer',
        revenue: totalRevenue * 0.25,
        jobsCompleted: Math.floor(totalJobs * 0.20),
        averageJobValue: 4800,
        averageRating: '4.9'
      },
      {
        id: 'emp-003',
        name: 'David Martinez',
        role: 'Technician',
        revenue: totalRevenue * 0.20,
        jobsCompleted: Math.floor(totalJobs * 0.25),
        averageJobValue: 3200,
        averageRating: '4.6'
      },
      {
        id: 'emp-004',
        name: 'Jennifer Chen',
        role: 'Technician',
        revenue: totalRevenue * 0.15,
        jobsCompleted: Math.floor(totalJobs * 0.20),
        averageJobValue: 2900,
        averageRating: '4.7'
      },
      {
        id: 'emp-005',
        name: 'Robert Taylor',
        role: 'Apprentice',
        revenue: totalRevenue * 0.10,
        jobsCompleted: Math.floor(totalJobs * 0.10),
        averageJobValue: 2100,
        averageRating: '4.4'
      }
    ];

    // Mock expense breakdown
    const expenseBreakdown = [
      {
        category: 'Materials',
        totalAmount: totalExpenses * 0.40,
        transactionCount: 145,
        averageAmount: (totalExpenses * 0.40) / 145
      },
      {
        category: 'Payroll',
        totalAmount: totalExpenses * 0.35,
        transactionCount: 60,
        averageAmount: (totalExpenses * 0.35) / 60
      },
      {
        category: 'Overhead',
        totalAmount: totalExpenses * 0.15,
        transactionCount: 25,
        averageAmount: (totalExpenses * 0.15) / 25
      },
      {
        category: 'Marketing',
        totalAmount: totalExpenses * 0.06,
        transactionCount: 12,
        averageAmount: (totalExpenses * 0.06) / 12
      },
      {
        category: 'Equipment',
        totalAmount: totalExpenses * 0.04,
        transactionCount: 8,
        averageAmount: (totalExpenses * 0.04) / 8
      }
    ];

    // Mock pending expenses
    const pendingExpenses = [
      {
        id: 'exp-001',
        category: 'Materials',
        amount: 2850,
        description: 'Heat pump components for Johnson installation',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'Mike Johnson'
      },
      {
        id: 'exp-002',
        category: 'Equipment',
        amount: 1250,
        description: 'Tool replacement and calibration',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'Sarah Williams'
      },
      {
        id: 'exp-003',
        category: 'Overhead',
        amount: 680,
        description: 'Vehicle maintenance - Truck #3',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'David Martinez'
      }
    ];

    // Mock cash flow data
    const cashFlow = monthlyTrend.map(month => ({
      month: month.month,
      revenue: month.revenue,
      expenses: month.revenue * 0.75,
      netProfit: month.revenue * 0.25
    }));

    return NextResponse.json({
      financialSummary,
      monthlyTrend,
      serviceTypeBreakdown,
      employeeRevenue,
      expenseBreakdown,
      pendingExpenses,
      cashFlow,
      period,
      dateRange: {
        start: new Date(currentYear - 1, currentMonth, 1).toISOString(),
        end: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Get financial data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}