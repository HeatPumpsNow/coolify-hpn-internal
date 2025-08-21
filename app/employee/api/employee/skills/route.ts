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

    // Get skills from the existing skill_progress table
    const skillsResult = await query(`
      SELECT 
        skill_id as id,
        skill_name as name,
        category,
        current_level,
        max_level,
        experience,
        experience_to_next,
        unlocked,
        completed_modules,
        created_at,
        updated_at
      FROM skill_progress
      WHERE employee_id = $1
      ORDER BY category, skill_name
    `, [employee.user?.id]);

    // Group skills by category and calculate stats
    const skillsByCategory = skillsResult.rows.reduce((acc: any, skill: any) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    }, {} as Record<string, any[]>);

    // Create category structure with proper icons and descriptions
    const categoryInfo: Record<string, { icon: string, description: string }> = {
      'installation': { icon: '🔧', description: 'Heat pump installation and setup skills' },
      'troubleshooting': { icon: '🔍', description: 'Diagnostic and problem-solving abilities' },
      'documentation': { icon: '📸', description: 'Photo documentation and quality standards' },
      'customer_service': { icon: '👥', description: 'Customer interaction and service excellence' }
    };

    const categories = Object.entries(skillsByCategory).map(([categoryName, skills]) => {
      const totalExperience = (skills as any[]).reduce((sum, skill) => sum + skill.experience, 0);
      const unlockedSkills = (skills as any[]).filter((skill: any) => skill.unlocked).length;
      const completedSkills = (skills as any[]).filter((skill: any) => skill.current_level === skill.max_level).length;
      const currentLevel = Math.floor(totalExperience / 100) + 1;
      const nextLevelPoints = currentLevel * 100;

      return {
        id: categoryName,
        name: categoryName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: categoryInfo[categoryName]?.description || 'Professional skill development',
        icon: categoryInfo[categoryName]?.icon || '⚡',
        totalPoints: totalExperience,
        currentLevel,
        nextLevelPoints,
        totalSkills: (skills as any[]).length,
        unlockedSkills,
        completedSkills,
        skills: (skills as any[]).map(skill => ({
          id: skill.id,
          name: skill.name,
          description: `${skill.name} - Level ${skill.current_level}/${skill.max_level}`,
          level: skill.current_level,
          points: skill.experience_to_next,
          pointsEarned: skill.experience,
          isUnlocked: skill.unlocked,
          isCompleted: skill.current_level === skill.max_level,
          requirements: skill.completed_modules || [],
          unlockedAt: skill.created_at,
          completedAt: skill.current_level === skill.max_level ? skill.updated_at : null
        }))
      };
    });

    // Mock achievements for now
    const achievements = [
      {
        id: 1,
        name: 'First Steps',
        description: 'Complete your first skill module',
        category: 'learning',
        pointsReward: 25,
        badgeIcon: '🏆',
        isUnlocked: skillsResult.rows.some((skill: any) => skill.unlocked),
        unlockedAt: skillsResult.rows.find((skill: any) => skill.unlocked)?.created_at || null
      },
      {
        id: 2,
        name: 'Skill Builder',
        description: 'Reach level 2 in any skill',
        category: 'progression',
        pointsReward: 50,
        badgeIcon: '⭐',
        isUnlocked: skillsResult.rows.some((skill: any) => skill.current_level >= 2),
        unlockedAt: null
      }
    ];

    return NextResponse.json({
      success: true,
      categories,
      achievements
    });

  } catch (error) {
    console.error('Skills fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch skills data' },
      { status: 500 }
    );
  }
}