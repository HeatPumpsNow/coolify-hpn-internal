'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Employee } from '@/lib/types';

interface KnowledgeArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  author: string;
  publishedAt: string;
  readTime: number;
  excerpt: string;
  tags: string[];
  isBookmarked?: boolean;
  hasRead?: boolean;
}

interface KnowledgeCategory {
  id: string;
  name: string;
  description: string;
  articleCount: number;
  icon: string;
}

export default function KnowledgePage() {
  const [employee, setany] = useState<any | null>(null);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<KnowledgeArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [articles, selectedCategory, searchQuery, difficultyFilter]);

  const loadData = async () => {
    try {
      // Load employee session
      const sessionResponse = await fetch('/api/employee/auth/session');
      const sessionData = await sessionResponse.json();
      setany(sessionData.employee);

      // Load knowledge base data
      const knowledgeResponse = await fetch('/api/employee/knowledge');
      const knowledgeData = await knowledgeResponse.json();
      
      setArticles(knowledgeData.articles || []);
      setCategories(knowledgeData.categories || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(article => article.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(article => article.difficulty === difficultyFilter);
    }

    setFilteredArticles(filtered);
  };

  const toggleBookmark = async (articleId: string) => {
    try {
      const response = await fetch(`/api/employee/knowledge/${articleId}/bookmark`, {
        method: 'POST',
      });

      if (response.ok) {
        setArticles(prev => prev.map(article => 
          article.id === articleId 
            ? { ...article, isBookmarked: !article.isBookmarked }
            : article
        ));
      }
    } catch (error) {
      console.error('Bookmark error:', error);
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Base</h1>
        <p className="text-gray-600">
          Learn from technical guides, best practices, and team knowledge.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Search */}
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Search</h3>
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Categories */}
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                  selectedCategory === 'all' 
                    ? 'bg-primary-100 text-primary-900' 
                    : 'hover:bg-gray-50'
                }`}
              >
                All Articles ({articles.length})
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    selectedCategory === category.id 
                      ? 'bg-primary-100 text-primary-900' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      {category.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {category.articleCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Difficulty</h3>
            <div className="space-y-2">
              <button
                onClick={() => setDifficultyFilter('all')}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                  difficultyFilter === 'all' 
                    ? 'bg-primary-100 text-primary-900' 
                    : 'hover:bg-gray-50'
                }`}
              >
                All Levels
              </button>
              {['beginner', 'intermediate', 'advanced'].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficultyFilter(level)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors capitalize ${
                    difficultyFilter === level 
                      ? 'bg-primary-100 text-primary-900' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {/* Quick Actions */}
          <div className="card mb-8">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
              <div className="flex gap-3">
                <Link href="/employee/knowledge/contribute" className="btn-primary">
                  Contribute Article
                </Link>
                <Link href="/employee/knowledge/bookmarks" className="btn-secondary">
                  My Bookmarks
                </Link>
              </div>
            </div>
          </div>

          {/* Articles Grid */}
          {filteredArticles.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
              <p className="text-gray-600">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredArticles.map((article) => (
                <div key={article.id} className="card hover:shadow-lg transition-shadow duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getDifficultyColor(article.difficulty)}`}>
                        {article.difficulty}
                      </span>
                      <span className="text-sm text-gray-500">
                        {article.readTime} min read
                      </span>
                    </div>
                    <button
                      onClick={() => toggleBookmark(article.id)}
                      className={`p-1 rounded-full transition-colors ${
                        article.isBookmarked 
                          ? 'text-yellow-500 hover:text-yellow-600' 
                          : 'text-gray-400 hover:text-gray-500'
                      }`}
                    >
                      <svg className="w-5 h-5" fill={article.isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>

                  <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-primary-600 transition-colors">
                    <Link href={`/employee/knowledge/${article.slug}`}>
                      {article.title}
                    </Link>
                  </h3>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {article.excerpt}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        {tag}
                      </span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        +{article.tags.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>By {article.author}</span>
                    <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                  </div>

                  {article.hasRead && (
                    <div className="mt-3 flex items-center gap-2 text-green-600 text-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Read
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}