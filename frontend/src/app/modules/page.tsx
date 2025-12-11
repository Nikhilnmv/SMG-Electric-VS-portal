'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { moduleApi, Module } from '@/lib/api';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { Search, Calendar, X } from 'lucide-react';

export default function ModulesPage() {
  const router = useRouter();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      const data = await moduleApi.listModules();
      setModules(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  // Filter modules based on search query and date filter
  const filteredModules = modules.filter((module) => {
    // Search filter - check title and description
    const matchesSearch = searchQuery === '' || 
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (module.description && module.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // Date filter - check if module was created on the selected date
    if (dateFilter && matchesSearch) {
      const moduleDate = new Date(module.createdAt).toISOString().split('T')[0];
      return moduleDate === dateFilter;
    }

    return matchesSearch;
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B214A] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading modules...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadModules}
              className="px-4 py-2 bg-[#0B214A] text-white rounded hover:bg-[#1a3d6b] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Learning Modules</h1>
          <p className="mt-2 text-gray-600">Browse and access your assigned educational modules</p>
        </div>

        {/* Search and Filter Bar */}
        {!loading && modules.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search modules by title or description..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                />
              </div>
              {/* Date Filter */}
              <div className="relative sm:w-64">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title="Clear date filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {/* Results count */}
            {(searchQuery || dateFilter) && (
              <div className="mt-3 text-sm text-gray-600">
                Showing {filteredModules.length} of {modules.length} module{modules.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {modules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No modules available yet.</p>
            <p className="text-gray-400 mt-2">Check back later for new content.</p>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No modules match your filters</h3>
            <p className="text-gray-500 mb-4">Try adjusting your search or date filter.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setDateFilter('');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0B214A] rounded-lg hover:bg-[#0a1a3a] transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((module) => (
              <Link
                key={module.id}
                href={`/modules/${module.id}`}
                className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{module.title}</h2>
                {module.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{module.description}</p>
                )}
                
                {module.userProgress && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progress</span>
                      <span>{module.userProgress.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#0B214A] h-2 rounded-full transition-all"
                        style={{ width: `${module.userProgress.progressPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {module.userProgress.completedLessons} of {module.userProgress.totalLessons} lessons completed
                    </p>
                  </div>
                )}

                {module.lessons && module.lessons.length > 0 && (
                  <p className="text-sm text-gray-500 mt-4">
                    {module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

