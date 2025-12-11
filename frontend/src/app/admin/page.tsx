'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { Shield, Users, Video, AlertCircle, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { adminApi, AdminStats, analyticsApi } from '@/lib/api';
import Link from 'next/link';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface VideoAnalytics {
  videoId: string;
  title: string;
  totalWatchTime: number;
  completionRate: number;
  playCount: number;
}

export default function AdminDashboardPage() {
  useRequireAdmin();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [topVideos, setTopVideos] = useState<VideoAnalytics[]>([]);
  const [dailyWatchTime, setDailyWatchTime] = useState<Array<{ date: string; watchTime: number }>>([]);
  const [focusUsage, setFocusUsage] = useState<Array<{ date: string; sessions: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both admin stats and analytics
      const [statsData, dashboardData] = await Promise.all([
        adminApi.getStats(),
        analyticsApi.getAdminDashboard(),
      ]);

      setStats(statsData);
      setAnalyticsData(dashboardData);

      // Format watch time per day
      if (dashboardData.watchTimePerDay) {
        setDailyWatchTime(
          dashboardData.watchTimePerDay.slice(-7).map((d: any) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            watchTime: Math.floor(d.watchTime || 0),
          }))
        );
      }

      // Format daily active users as focus usage
      if (dashboardData.dailyActiveUsers) {
        setFocusUsage(
          dashboardData.dailyActiveUsers.slice(-7).map((d: any) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sessions: d.activeUsers || 0,
          }))
        );
      }

      // Set top videos from dashboard
      if (dashboardData.topPerformingVideos) {
        setTopVideos(
          dashboardData.topPerformingVideos.map((v: any) => ({
            videoId: v.videoId,
            title: v.title,
            totalWatchTime: Math.floor(v.watchTime || 0),
            completionRate: v.completionRate || 0,
            playCount: v.views || 0,
          }))
        );
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      const errorMessage = err?.message || 'Failed to load statistics. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-[#0B214A]" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">Overview of platform statistics and management</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link href="/admin/users" className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Users</span>
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-2">View all users →</p>
              </Link>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Videos</span>
                  <Video className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalVideos || 0}</p>
                <p className="text-xs text-gray-500 mt-2">All videos</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Watch Time</span>
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData ? formatWatchTime(analyticsData.totalWatchTime || 0) : '0m'}
                </p>
                <p className="text-xs text-gray-500 mt-2">All time</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData ? `${(analyticsData.avgCompletionRate || 0).toFixed(1)}%` : '0%'}
                </p>
                <p className="text-xs text-gray-500 mt-2">Average</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Active Users (24h)</span>
                  <Users className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData?.dailyActiveUsers?.[0]?.activeUsers || 0}
                </p>
                <p className="text-xs text-gray-500 mt-2">Last 24 hours</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Views</span>
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {analyticsData?.totalViews || 0}
                </p>
                <p className="text-xs text-gray-500 mt-2">All time</p>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Watch Time Line Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Watch Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyWatchTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="watchTime" stroke="#0B214A" strokeWidth={2} name="Watch Time (sec)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Focus Mode Usage Area Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Active Users</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={focusUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="sessions" stroke="#0B214A" fill="#0B214A" fillOpacity={0.6} name="Active Users" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Videos Table */}
            {topVideos.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Top Videos by Watch Time</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Video Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Watch Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completion Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Play Count
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topVideos.slice(0, 5).map((video) => (
                        <tr key={video.videoId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{video.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatWatchTime(video.totalWatchTime)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{video.completionRate.toFixed(1)}%</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{video.playCount}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/admin/users"
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">User Management</h3>
                    <p className="text-sm text-gray-600">Manage users and roles</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/admin/modules"
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Video className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Modules & Lessons</h3>
                    <p className="text-sm text-gray-600">Manage content and modules</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/admin/analytics"
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Full Analytics</h3>
                    <p className="text-sm text-gray-600">View detailed analytics</p>
                  </div>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
