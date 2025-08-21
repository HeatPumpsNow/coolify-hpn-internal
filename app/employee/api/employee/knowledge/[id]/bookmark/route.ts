import { NextRequest, NextResponse } from 'next/server';
import AuthService from '@/lib/supabase/server';
import { query } from '@/lib/database';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
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

    const articleId = params.id;

    // Check if article exists
    const articleCheck = await query(
      'SELECT id FROM knowledge_articles WHERE id = $1 AND status = $2',
      [articleId, 'published']
    );

    if (articleCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Check if already bookmarked
    const bookmarkCheck = await query(
      'SELECT id FROM article_bookmarks WHERE article_id = $1 AND employee_id = $2',
      [articleId, employee.id]
    );

    if (bookmarkCheck.rows.length > 0) {
      // Remove bookmark
      await query(
        'DELETE FROM article_bookmarks WHERE article_id = $1 AND employee_id = $2',
        [articleId, employee.id]
      );

      return NextResponse.json({
        success: true,
        bookmarked: false,
        message: 'Bookmark removed'
      });
    } else {
      // Add bookmark
      await query(
        'INSERT INTO article_bookmarks (article_id, employee_id) VALUES ($1, $2)',
        [articleId, employee.id]
      );

      return NextResponse.json({
        success: true,
        bookmarked: true,
        message: 'Article bookmarked'
      });
    }

  } catch (error) {
    console.error('Bookmark error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle bookmark' },
      { status: 500 }
    );
  }
}