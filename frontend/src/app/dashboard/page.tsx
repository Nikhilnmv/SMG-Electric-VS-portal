'use client';

import MainLayout from '@/components/layout/MainLayout';
import { Video, Clock, TrendingUp, Eye, Target, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { videoApi, analyticsApi } from '@/lib/api';
import Link from 'next/link';

interface DashboardData {
  videosWatched: number;
  totalWatchTime: number;
  completionRate: number;
  streak: {
    current: number;
    longest: number;
    lastActivity: string | null;
  };
  recommendedVideos: Array<{
    id: string;
    title: string;
    description: string | null;
    duration: number | null;
  }>;
  recentlyWatched?: Array<{
    videoId: string;
    title: string;
    duration: number | null;
    lastWatched: string | null;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalVideos: 0,
    watchTime: 0,
    completionRate: 0,
    totalViews: 0,
    streak: 0,
  });
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);
        const data = await analyticsApi.getUserDashboard();
        setDashboardData(data);
        setStats({
          totalVideos: data.videosWatched || 0,
          watchTime: (data.totalWatchTime || 0) / 3600, // Convert seconds to hours
          completionRate: data.completionRate || 0,
          totalViews: data.videosWatched || 0,
          streak: data.streak?.current || 0,
        });
      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        setError(error?.message || 'Failed to load dashboard data');
        // Fallback to placeholder on error
        setStats({
          totalVideos: 0,
          watchTime: 0,
          completionRate: 0,
          totalViews: 0,
          streak: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const statCards = [
    {
      label: 'Videos Watched',
      value: stats.totalVideos,
      icon: Video,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Watch Time (hrs)',
      value: stats.watchTime.toFixed(1),
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Completion Rate',
      value: `${stats.completionRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Current Streak',
      value: stats.streak,
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's an overview of your activity.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B214A]"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      </div>
                      <div className={`${stat.bgColor} p-3 rounded-lg`}>
                        <Icon className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recently Watched Videos */}
            {dashboardData?.recentlyWatched && dashboardData.recentlyWatched.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recently Watched</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.recentlyWatched.slice(0, 6).map((video) => (
                    <Link
                      key={video.videoId}
                      href={`/watch/${video.videoId}`}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
                      {video.duration && (
                        <p className="text-sm text-gray-500">
                          {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                        </p>
                      )}
                      {video.lastWatched && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last watched: {new Date(video.lastWatched).toLocaleDateString()}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Videos */}
            {dashboardData?.recommendedVideos && dashboardData.recommendedVideos.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Recommended for You</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.recommendedVideos.slice(0, 6).map((video) => (
                    <Link
                      key={video.id}
                      href={`/watch/${video.id}`}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{video.description}</p>
                      )}
                      {video.duration && (
                        <p className="text-xs text-gray-500">
                          {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/upload"
                className="bg-[#0B214A] text-white rounded-lg p-6 hover:bg-[#1a3d6b] transition-colors"
              >
                <h2 className="text-xl font-semibold mb-2">Upload New Video</h2>
                <p className="text-white/80">Start sharing your content with the platform</p>
              </Link>

              <Link
                href="/my-videos"
                className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:bg-gray-100 transition-colors"
              >
                <h2 className="text-xl font-semibold mb-2 text-gray-900">My Videos</h2>
                <p className="text-gray-600">View and manage your uploaded videos</p>
              </Link>

              <Link
                href="/analytics"
                className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:bg-gray-100 transition-colors"
              >
                <h2 className="text-xl font-semibold mb-2 text-gray-900">View Analytics</h2>
                <p className="text-gray-600">Track your video performance and engagement</p>
              </Link>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

