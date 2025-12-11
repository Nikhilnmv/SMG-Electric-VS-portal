'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { analyticsApi } from '@/lib/api';
import { BarChart3, Clock, Users, Target, AlertCircle, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';

interface OverviewData {
  totalEvents: number;
  totalWatchTime: number;
  averageCompletionRate: number;
  activeUsersLast24h: number;
  totalFocusSessions: number;
}

interface VideoAnalytics {
  videoId: string;
  title: string;
  totalWatchTime: number;
  completionRate: number;
  playCount: number;
}

export default function AdminAnalyticsPage() {
  useRequireAdmin();

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [topVideos, setTopVideos] = useState<VideoAnalytics[]>([]);
  const [dailyWatchTime, setDailyWatchTime] = useState<Array<{ date: string; watchTime: number }>>([]);
  const [focusUsage, setFocusUsage] = useState<Array<{ date: string; sessions: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch admin dashboard data
      const dashboardData = await analyticsApi.getAdminDashboard();
      
      // Set overview from dashboard
      setOverview({
        totalEvents: dashboardData.totalViews || 0,
        totalWatchTime: dashboardData.totalWatchTime || 0,
        averageCompletionRate: dashboardData.avgCompletionRate || 0,
        activeUsersLast24h: dashboardData.dailyActiveUsers?.[0]?.activeUsers || 0,
        totalFocusSessions: 0, // Not in dashboard data
      });

      // Format watch time per day
      if (dashboardData.watchTimePerDay) {
        setDailyWatchTime(
          dashboardData.watchTimePerDay.slice(-7).map((d: any) => ({
            date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            watchTime: Math.floor(d.watchTime || 0),
          }))
        );
      }

      // Format daily active users as focus usage (simplified)
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
      console.error('Error fetching analytics:', err);
      const errorMessage = err?.message || 'Failed to load analytics. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
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
            <BarChart3 className="h-8 w-8 text-[#0B214A]" />
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          </div>
          <p className="text-gray-600">Platform-wide analytics and insights</p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Watch Time</span>
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {overview ? formatWatchTime(overview.totalWatchTime) : '0m'}
                </p>
                <p className="text-xs text-gray-500 mt-2">All time (seconds)</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {overview ? `${overview.averageCompletionRate.toFixed(1)}%` : '0%'}
                </p>
                <p className="text-xs text-gray-500 mt-2">Average</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Active Users (24h)</span>
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {overview ? overview.activeUsersLast24h : 0}
                </p>
                <p className="text-xs text-gray-500 mt-2">Last 24 hours</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Focus Sessions</span>
                  <Target className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {overview ? overview.totalFocusSessions : 0}
                </p>
                <p className="text-xs text-gray-500 mt-2">Total sessions</p>
              </div>
            </div>

            {/* Charts */}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Focus Mode Usage</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={focusUsage}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="sessions" stroke="#0B214A" fill="#0B214A" fillOpacity={0.6} name="Sessions" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Completion Rate Bar Chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Rate by Video</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topVideos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completionRate" fill="#0B214A" name="Completion Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Videos Table */}
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {topVideos.map((video) => (
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/admin/analytics/video/${video.videoId}`}
                            className="text-[#0B214A] hover:text-[#1a3d6b]"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}

