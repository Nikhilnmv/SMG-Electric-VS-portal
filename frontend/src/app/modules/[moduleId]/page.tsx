'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { moduleApi, Module, Lesson } from '@/lib/api';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import { Play, Lock, CheckCircle2, Clock } from 'lucide-react';

export default function ModuleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const moduleId = params.moduleId as string;
  const [module, setModule] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (moduleId) {
      loadModule();
    }
  }, [moduleId]);

  // Refresh module data when page becomes visible (user returns from watching a lesson)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && moduleId) {
        loadModule();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [moduleId]);

  const loadModule = async () => {
    try {
      setLoading(true);
      const data = await moduleApi.getModule(moduleId);
      setModule(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load module');
    } finally {
      setLoading(false);
    }
  };

  const getThumbnailUrl = (thumbnailUrl?: string | null): string | null => {
    if (!thumbnailUrl) return null;
    const storageMode = process.env.NEXT_PUBLIC_STORAGE_MODE || 'local';
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // If it's already a full URL, return it
    if (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')) {
      return thumbnailUrl;
    }
    
    // For local storage, construct full URL
    if (storageMode === 'local' && thumbnailUrl.startsWith('/uploads')) {
      return `${API_URL}${thumbnailUrl}`;
    }
    
    // For S3/CloudFront, use CloudFront URL if available
    if (storageMode === 's3') {
      const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUD_FRONT_URL || '';
      if (cloudFrontUrl) {
        return `${cloudFrontUrl}${thumbnailUrl.startsWith('/') ? '' : '/'}${thumbnailUrl}`;
      }
    }
    
    return thumbnailUrl;
  };

  const formatDuration = (seconds?: number | null): string => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B214A] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading module...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !module) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Module not found'}</p>
            <button
              onClick={() => router.push('/modules')}
              className="px-4 py-2 bg-[#0B214A] text-white rounded hover:bg-[#1a3d6b] transition-colors"
            >
              Back to Modules
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const lessons = module.lessons || [];

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <button
            onClick={() => router.push('/modules')}
            className="text-[#0B214A] hover:text-[#1a3d6b] mb-4 flex items-center gap-2 transition-colors"
          >
            ← Back to Modules
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{module.title}</h1>
          {module.description && (
            <p className="mt-2 text-gray-600">{module.description}</p>
          )}
        </div>

        {module.userProgress && (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm font-semibold text-[#0B214A]">
                {module.userProgress.progressPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-[#0B214A] h-3 rounded-full transition-all"
                style={{ width: `${module.userProgress.progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {module.userProgress.completedLessons} of {module.userProgress.totalLessons} lessons completed
            </p>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Lessons</h2>
          
          {lessons.length === 0 ? (
            <p className="text-gray-500">No lessons available in this module yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lessons.map((lesson, index) => {
                const previousLesson = lessons[index - 1];
                // A lesson can be accessed if:
                // 1. It's the first lesson (index === 0), OR
                // 2. The previous lesson exists and is completed
                const canAccess = index === 0 || (previousLesson?.userProgress?.completed === true);
                const thumbnailUrl = getThumbnailUrl(lesson.thumbnailUrl);
                const isCompleted = lesson.userProgress?.completed === true;

                return (
                  <Link
                    key={lesson.id}
                    href={canAccess ? `/lesson/${lesson.id}` : '#'}
                    className={`group relative bg-white border-2 rounded-lg overflow-hidden transition-all ${
                      canAccess
                        ? 'border-gray-200 hover:border-[#0B214A] hover:shadow-lg'
                        : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                    }`}
                    onClick={(e) => {
                      if (!canAccess) {
                        e.preventDefault();
                        alert('Please complete the previous lesson before accessing this one.');
                      }
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gray-100 relative overflow-hidden">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={lesson.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <Play className="h-12 w-12 text-gray-400 group-hover:text-[#0B214A] transition-colors" />
                        </div>
                      )}
                      
                      {/* Overlay with play icon */}
                      {canAccess && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="bg-white/90 rounded-full p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-6 w-6 text-[#0B214A] fill-[#0B214A]" />
                          </div>
                        </div>
                      )}
                      
                      {/* Lock icon for locked lessons */}
                      {!canAccess && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Lock className="h-8 w-8 text-white" />
                        </div>
                      )}
                      
                      {/* Completed badge */}
                      {isCompleted && (
                        <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1.5">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                      )}
                      
                      {/* Lesson number badge */}
                      <div className="absolute top-2 left-2 bg-[#0B214A] text-white rounded-full w-8 h-8 flex items-center justify-center font-semibold text-sm">
                        {lesson.order + 1}
                      </div>
                      
                      {/* Duration badge */}
                      {lesson.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white rounded px-2 py-1 flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          {formatDuration(lesson.duration)}
                        </div>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 group-hover:text-[#0B214A] transition-colors">
                        {lesson.title}
                      </h3>
                      {lesson.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                          {lesson.description}
                        </p>
                      )}
                      
                      {/* Progress indicator */}
                      {lesson.userProgress && !isCompleted && lesson.userProgress.progress > 0 && lesson.duration && lesson.duration > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>In Progress</span>
                            <span>{Math.round((lesson.userProgress.progress / lesson.duration) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-[#0B214A] h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (lesson.userProgress.progress / lesson.duration) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      
                      {/* Status text */}
                      {!canAccess && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                          <Lock className="h-3 w-3" />
                          <span>Locked</span>
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

