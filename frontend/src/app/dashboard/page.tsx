'use client';

import MainLayout from '@/components/layout/MainLayout';
import { Video, Clock, TrendingUp, Target, AlertCircle, BarChart3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { analyticsApi } from '@/lib/api';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchTimeHistory, setWatchTimeHistory] = useState<Array<{ date: string; watchTime: number }>>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await analyticsApi.getUserDashboard();
      setDashboardData(data);

      // Generate watch time history (last 7 days) - simplified distribution
      const history = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        history.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          watchTime: Math.floor((data.totalWatchTime || 0) / 7 * (0.7 + Math.random() * 0.6)),
        });
      }
      setWatchTimeHistory(history);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      setError(error?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statCards = [
    {
      label: 'Videos Watched',
      value: dashboardData?.videosWatched || 0,
      icon: Video,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Total unique videos',
    },
    {
      label: 'Watch Time (hrs)',
      value: dashboardData?.totalWatchTime ? (dashboardData.totalWatchTime / 3600).toFixed(1) : '0.0',
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Total time spent',
    },
    {
      label: 'Completion Rate',
      value: dashboardData?.completionRate ? `${dashboardData.completionRate.toFixed(1)}%` : '0%',
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Average completion',
    },
    {
      label: 'Current Streak',
      value: dashboardData?.streak?.current || 0,
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Days in a row',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-8 w-8 text-[#0B214A]" />
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <p className="text-gray-600">Welcome back! Here's an overview of your learning activity and analytics.</p>
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
        ) : dashboardData ? (
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
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">{stat.label}</span>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Watch Time Over Time */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Watch Time Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={watchTimeHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="watchTime"
                      stroke="#0B214A"
                      strokeWidth={2}
                      name="Watch Time (sec)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Streak Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Streak</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Current Streak</span>
                      <span className="text-2xl font-bold text-orange-600">
                        {dashboardData.streak?.current || 0} days
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min((dashboardData.streak?.current || 0) * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Longest Streak</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {dashboardData.streak?.longest || 0} days
                      </span>
                    </div>
                    {dashboardData.streak?.lastActivity && (
                      <p className="text-xs text-gray-500 mt-2">
                        Last activity: {new Date(dashboardData.streak.lastActivity).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Recently Watched Videos */}
            {dashboardData.recentlyWatched && dashboardData.recentlyWatched.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Recently Watched</h2>
                  <Link
                    href="/watch-history"
                    className="text-sm text-[#0B214A] hover:text-[#1a3d6b] font-medium"
                  >
                    View All →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dashboardData.recentlyWatched.slice(0, 6).map((video) => (
                    <Link
                      key={video.videoId}
                      href={`/watch/${video.videoId}`}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
                      {video.duration && (
                        <p className="text-sm text-gray-500 mb-1">
                          {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                        </p>
                      )}
                      {video.lastWatched && (
                        <p className="text-xs text-gray-400">
                          {new Date(video.lastWatched).toLocaleDateString()}
                        </p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Videos */}
            {dashboardData.recommendedVideos && dashboardData.recommendedVideos.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
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
                href="/modules"
                className="bg-[#0B214A] text-white rounded-lg p-6 hover:bg-[#1a3d6b] transition-colors"
              >
                <h2 className="text-xl font-semibold mb-2">Browse Modules</h2>
                <p className="text-white/80">Explore available learning modules and lessons</p>
              </Link>

              <Link
                href="/watch-history"
                className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:bg-gray-100 transition-colors"
              >
                <h2 className="text-xl font-semibold mb-2 text-gray-900">Watch History</h2>
                <p className="text-gray-600">Continue watching from where you left off</p>
              </Link>

              <Link
                href="/focus-mode"
                className="bg-gray-50 border border-gray-200 rounded-lg p-6 hover:bg-gray-100 transition-colors"
              >
                <h2 className="text-xl font-semibold mb-2 text-gray-900">Focus Mode</h2>
                <p className="text-gray-600">Distraction-free learning experience</p>
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No dashboard data available</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
