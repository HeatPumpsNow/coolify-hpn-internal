import { NextRequest, NextResponse } from 'next/server';
import AuthService from '@/lib/supabase/server';
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

    // Get knowledge categories with article counts
    const categoriesResult = await query(`
      SELECT 
        kc.id,
        kc.name,
        kc.description,
        kc.icon,
        COUNT(ka.id) as article_count
      FROM knowledge_categories kc
      LEFT JOIN knowledge_articles ka ON kc.id = ka.category_id AND ka.status = 'published'
      GROUP BY kc.id, kc.name, kc.description, kc.icon, kc.sort_order
      ORDER BY kc.sort_order
    `);

    // Get published articles with author info and user interaction data
    const articlesResult = await query(`
      SELECT 
        ka.id,
        ka.title,
        ka.slug,
        ka.excerpt,
        ka.difficulty,
        ka.read_time,
        ka.tags,
        ka.published_at,
        ka.category_id,
        kc.name as category_name,
        e.first_name || ' ' || e.last_name as author_name,
        CASE WHEN ab.article_id IS NOT NULL THEN true ELSE false END as is_bookmarked,
        CASE WHEN av.article_id IS NOT NULL THEN true ELSE false END as has_read
      FROM knowledge_articles ka
      INNER JOIN knowledge_categories kc ON ka.category_id = kc.id
      INNER JOIN employees e ON ka.author_id = e.id
      LEFT JOIN article_bookmarks ab ON ka.id = ab.article_id AND ab.employee_id = $1
      LEFT JOIN article_views av ON ka.id = av.article_id AND av.employee_id = $1
      WHERE ka.status = 'published'
      ORDER BY ka.published_at DESC
    `, [employee.user?.id]);

    const categories = categoriesResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      articleCount: parseInt(row.article_count)
    }));

    const articles = articlesResult.rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      category: row.category_name.toLowerCase(),
      difficulty: row.difficulty,
      author: row.author_name,
      publishedAt: row.published_at,
      readTime: row.read_time,
      excerpt: row.excerpt,
      tags: row.tags ? JSON.parse(row.tags) : [],
      isBookmarked: row.is_bookmarked,
      hasRead: row.has_read
    }));

    return NextResponse.json({
      success: true,
      categories,
      articles
    });

  } catch (error) {
    console.error('Knowledge fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base data' },
      { status: 500 }
    );
  }
}