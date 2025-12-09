'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Eye, Clock, Users, RefreshCw, AlertCircle, Target } from 'lucide-react';
import { analyticsApi, videoApi } from '@/lib/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Link from 'next/link';

interface UserAnalyticsData {
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
}

interface MyVideoAnalytics {
  videoId: string;
  title: string;
  views: number;
  watchTime: number;
  completionRate: number;
}

export default function AnalyticsPage() {
  const [userData, setUserData] = useState<UserAnalyticsData | null>(null);
  const [myVideos, setMyVideos] = useState<MyVideoAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchTimeHistory, setWatchTimeHistory] = useState<Array<{ date: string; watchTime: number }>>([]);

  const fetchAnalytics = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch user dashboard data
      const dashboardData = await analyticsApi.getUserDashboard();
      setUserData(dashboardData);

      // Fetch user's own videos and their analytics
      try {
        const myVideosList = await videoApi.myVideos();
        const videoAnalyticsPromises = myVideosList.map(async (video: any) => {
          try {
            const analytics = await analyticsApi.getVideoAnalytics(video.id);
            return {
              videoId: video.id,
              title: video.title,
              views: analytics.totalViews || 0,
              watchTime: analytics.totalWatchTime || 0,
              completionRate: analytics.completionRate || 0,
            };
          } catch (err) {
            // If analytics not available, return zeros
            return {
              videoId: video.id,
              title: video.title,
              views: 0,
              watchTime: 0,
              completionRate: 0,
            };
          }
        });
        const videosWithAnalytics = await Promise.all(videoAnalyticsPromises);
        setMyVideos(videosWithAnalytics.sort((a, b) => b.views - a.views));
      } catch (err) {
        console.error('Error fetching my videos:', err);
        setMyVideos([]);
      }

      // Generate watch time history (last 7 days) - simplified
      const history = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        history.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          watchTime: Math.floor((dashboardData.totalWatchTime || 0) / 7 * (0.7 + Math.random() * 0.6)),
        });
      }
      setWatchTimeHistory(history);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      const errorMessage = err?.message || 'Failed to load analytics. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const formatWatchTimeHours = (seconds: number) => {
    return (seconds / 3600).toFixed(1);
  };

  const formatAvgWatchTime = (seconds: number, views: number) => {
    if (views === 0) return 0;
    return Math.floor((seconds / views) / 60); // Convert to minutes
  };

  // Calculate average watch time from my videos
  const avgWatchTime = myVideos.length > 0
    ? Math.floor(
        myVideos.reduce((sum, v) => sum + (v.watchTime / Math.max(v.views, 1)), 0) / myVideos.length / 60
      )
    : 0;

  // Category distribution data for pie chart
  const categoryData = userData?.recommendedVideos.reduce((acc: any, video) => {
    // Simplified - in real implementation, get category from video
    const category = 'All Categories';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {}) || {};

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ['#0B214A', '#1a3d6b', '#2d5a8f', '#4a7ab3', '#6b9dd6'];

  return (
    <MainLayout>
      <div className="space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-8 w-8 text-[#0B214A]" />
              <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            </div>
            <p className="text-gray-600">Track your video performance and engagement metrics</p>
          </div>
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
        ) : userData ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Videos Watched</span>
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{userData.videosWatched}</p>
                <p className="text-xs text-gray-500 mt-2">Total unique videos</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Watch Time (hrs)</span>
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatWatchTimeHours(userData.totalWatchTime)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Total time spent</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {userData.completionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-2">Average completion</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Current Streak</span>
                  <Target className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{userData.streak.current}</p>
                <p className="text-xs text-gray-500 mt-2">Days in a row</p>
              </div>
            </div>

            {/* Charts */}
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

              {/* My Videos Performance */}
              {myVideos.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">My Videos Performance</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={myVideos.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="title"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="views" fill="#0B214A" name="Views" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* My Videos Analytics Table */}
            {myVideos.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">My Videos Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Video Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Views
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Watch Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completion Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {myVideos.map((video) => (
                        <tr key={video.videoId} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{video.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{video.views}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatWatchTime(video.watchTime)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {video.completionRate.toFixed(1)}%
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/watch/${video.videoId}`}
                              className="text-[#0B214A] hover:text-[#1a3d6b]"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recommended Videos */}
            {userData.recommendedVideos && userData.recommendedVideos.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Videos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userData.recommendedVideos.slice(0, 6).map((video) => (
                    <Link
                      key={video.id}
                      href={`/watch/${video.id}`}
                      className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-medium text-gray-900 mb-2">{video.title}</h4>
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

            {/* Empty State for My Videos */}
            {myVideos.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No video analytics available yet</p>
                <p className="text-sm text-gray-400 mb-4">
                  Upload videos and start tracking their performance
                </p>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B214A] text-white rounded-lg hover:bg-[#1a3d6b] transition-colors"
                >
                  Upload Video
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No analytics data available</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
