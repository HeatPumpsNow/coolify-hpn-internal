'use client';

import { useEffect, useState } from 'react';
import { Employee } from '@/types';

interface SkillCategory {
  id: string;
  name: string;
  description: string;
  totalPoints: number;
  currentLevel: number;
  nextLevelPoints: number;
  skills: Skill[];
}

interface Skill {
  id: string;
  name: string;
  description: string;
  points: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  requirements?: string[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  pointsReward: number;
  badgeIcon: string;
  isUnlocked: boolean;
  unlockedAt?: string;
}

export default function SkillsPage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load employee session
      const sessionResponse = await fetch('/api/employee/auth/session');
      const sessionData = await sessionResponse.json();
      setEmployee(sessionData.employee);

      // Load skills and achievements
      const skillsResponse = await fetch('/api/employee/skills');
      const skillsData = await skillsResponse.json();
      
      setSkillCategories(skillsData.categories || []);
      setAchievements(skillsData.achievements || []);
      
      if (skillsData.categories?.length > 0 && !selectedCategory) {
        setSelectedCategory(skillsData.categories[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const totalPoints = skillCategories.reduce((sum, cat) => sum + cat.totalPoints, 0);
  const unlockedAchievements = achievements.filter(a => a.isUnlocked);
  const selectedCategoryData = skillCategories.find(cat => cat.id === selectedCategory);

  const getLevelColor = (level: number) => {
    if (level >= 5) return 'text-purple-600 bg-purple-100';
    if (level >= 4) return 'text-blue-600 bg-blue-100';
    if (level >= 3) return 'text-green-600 bg-green-100';
    if (level >= 2) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Skills & Progress</h1>
        <p className="text-gray-600">
          Track your professional development and unlock new abilities.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card-compact">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{totalPoints}</h3>
              <p className="text-sm text-gray-600">Total Points</p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{skillCategories.length}</h3>
              <p className="text-sm text-gray-600">Skill Areas</p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">{unlockedAchievements.length}</h3>
              <p className="text-sm text-gray-600">Achievements</p>
            </div>
          </div>
        </div>

        <div className="card-compact">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getLevelColor(employee?.currentLevel || 1)}`}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-2xl font-bold text-gray-900">Level {employee?.currentLevel || 1}</h3>
              <p className="text-sm text-gray-600">{employee?.levelName || employee?.role}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Skill Categories */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Skill Categories</h2>
            
            {/* Category Selector */}
            <div className="flex flex-wrap gap-2 mb-6">
              {skillCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Selected Category Details */}
            {selectedCategoryData && (
              <div>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedCategoryData.name}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(selectedCategoryData.currentLevel)}`}>
                      Level {selectedCategoryData.currentLevel}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{selectedCategoryData.description}</p>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>{selectedCategoryData.totalPoints} points</span>
                      <span>Next level: {selectedCategoryData.nextLevelPoints} points</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min((selectedCategoryData.totalPoints / selectedCategoryData.nextLevelPoints) * 100, 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Skills List */}
                <div className="space-y-4">
                  {selectedCategoryData.skills.map((skill) => (
                    <div 
                      key={skill.id} 
                      className={`p-4 rounded-lg border-2 transition-all ${
                        skill.isCompleted 
                          ? 'border-green-200 bg-green-50' 
                          : skill.isUnlocked 
                            ? 'border-blue-200 bg-blue-50' 
                            : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">{skill.name}</h4>
                            {skill.isCompleted && (
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {!skill.isUnlocked && (
                              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">{skill.description}</p>
                          {skill.requirements && skill.requirements.length > 0 && (
                            <div className="text-sm text-gray-500">
                              <span className="font-medium">Requirements:</span> {skill.requirements.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-primary-600">+{skill.points}</span>
                          <p className="text-sm text-gray-500">points</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div>
          <div className="card">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Achievements</h2>
            
            {achievements.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No achievements yet</h3>
                <p className="text-gray-600">Complete jobs and upload photos to earn your first achievement!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {achievements.map((achievement) => (
                  <div 
                    key={achievement.id}
                    className={`p-4 rounded-lg border transition-all ${
                      achievement.isUnlocked 
                        ? 'border-yellow-200 bg-yellow-50' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        achievement.isUnlocked ? 'bg-yellow-200' : 'bg-gray-200'
                      }`}>
                        <span className="text-2xl">{achievement.badgeIcon}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${achievement.isUnlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                          {achievement.name}
                        </h4>
                        <p className={`text-sm ${achievement.isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                          {achievement.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-sm font-medium ${achievement.isUnlocked ? 'text-yellow-600' : 'text-gray-400'}`}>
                            +{achievement.pointsReward} points
                          </span>
                          {achievement.unlockedAt && (
                            <span className="text-xs text-gray-500">
                              Earned {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}