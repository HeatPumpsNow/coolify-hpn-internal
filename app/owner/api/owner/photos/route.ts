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

    // Generate mock data for demonstration (in production, this would come from database)
    const mockPhotos = [
      {
        id: '1',
        jobId: 'job-001',
        employeeId: 'emp-001',
        photoUrl: '/api/placeholder/400/300',
        thumbnailUrl: '/api/placeholder/200/150',
        description: 'Pre-installation site inspection - showing existing unit',
        phase: 'pre-installation',
        status: 'pending',
        feedback: null,
        submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        reviewedAt: null,
        job: {
          customerName: 'John Smith',
          serviceType: 'Heat Pump Installation',
          address: '123 Main St, Austin, TX',
          scheduledDate: new Date()
        },
        employee: {
          name: 'Mike Johnson'
        },
        reviewer: null
      },
      {
        id: '2',
        jobId: 'job-002',
        employeeId: 'emp-002',
        photoUrl: '/api/placeholder/400/300',
        thumbnailUrl: '/api/placeholder/200/150',
        description: 'Installation in progress - unit positioning',
        phase: 'installation',
        status: 'approved',
        feedback: 'Good positioning, proper clearances maintained',
        submittedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        reviewedAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        job: {
          customerName: 'Sarah Davis',
          serviceType: 'Heat Pump Installation',
          address: '456 Oak Ave, Austin, TX',
          scheduledDate: new Date()
        },
        employee: {
          name: 'David Wilson'
        },
        reviewer: {
          name: 'Business Owner'
        }
      },
      {
        id: '3',
        jobId: 'job-003',
        employeeId: 'emp-001',
        photoUrl: '/api/placeholder/400/300',
        thumbnailUrl: '/api/placeholder/200/150',
        description: 'Post-installation testing and commissioning',
        phase: 'post-installation',
        status: 'pending',
        feedback: null,
        submittedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        reviewedAt: null,
        job: {
          customerName: 'Robert Brown',
          serviceType: 'Heat Pump Installation',
          address: '789 Pine St, Austin, TX',
          scheduledDate: new Date()
        },
        employee: {
          name: 'Mike Johnson'
        },
        reviewer: null
      }
    ];

    // Mock summary data
    const photoSummary = {
      totalPhotos: 3,
      pendingPhotos: 2,
      approvedPhotos: 1,
      rejectedPhotos: 0,
      photosToday: 3,
      photosThisWeek: 3,
      averageReviewTime: '2.5'
    };

    // Mock phase distribution
    const phaseDistribution = [
      { phase: 'pre-installation', total: 1, pending: 1, approved: 0, rejected: 0 },
      { phase: 'installation', total: 1, pending: 0, approved: 1, rejected: 0 },
      { phase: 'post-installation', total: 1, pending: 1, approved: 0, rejected: 0 }
    ];

    return NextResponse.json({
      photos: mockPhotos,
      summary: photoSummary,
      phaseDistribution
    });

  } catch (error) {
    console.error('Get photos error', error);
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const { photoIds, action, feedback } = await request.json();

    if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: 'Photo IDs are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    // Mock successful update response
    console.log(`Photos ${action}d`, {
      photoIds,
      reviewedBy: owner.id,
      feedback,
      count: photoIds.length
    });

    return NextResponse.json({
      success: true,
      message: `${photoIds.length} photo${photoIds.length === 1 ? '' : 's'} ${action}d successfully`,
      updatedPhotos: photoIds.length
    });

  } catch (error) {
    console.error('Update photos error', error);
    return NextResponse.json(
      { error: 'Failed to update photos' },
      { status: 500 }
    );
  }
}