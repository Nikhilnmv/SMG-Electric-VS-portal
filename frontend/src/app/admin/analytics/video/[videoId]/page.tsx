'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { analyticsApi } from '@/lib/api';
import { ArrowLeft, Clock, Play, TrendingUp, Target, RefreshCw, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

interface VideoAnalyticsData {
  videoId: string;
  videoTitle: string;
  totalWatchTime: number;
  playCount: number;
  completionRate: number;
  averageProgress: number;
  dropOffPoints: Array<{ progress: number; count: number }>;
}

export default function VideoAnalyticsPage({ params }: { params: { videoId: string } }) {
  useRequireAdmin();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<VideoAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await analyticsApi.getVideoAnalytics(params.videoId);
      setAnalytics({
        videoId: data.videoId,
        videoTitle: data.videoTitle || 'Unknown',
        totalWatchTime: data.totalWatchTime || 0,
        playCount: data.totalViews || 0,
        completionRate: data.completionRate || 0,
        averageProgress: data.avgWatchTime || 0,
        dropOffPoints: data.dropOffPoints || [],
      });
    } catch (err: any) {
      console.error('Error fetching video analytics:', err);
      const errorMessage = err?.message || 'Failed to load video analytics. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [params.videoId]);

  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/admin/analytics"
              className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Analytics
            </Link>
            <div className="flex items-center gap-3 mb-2">
              <Target className="h-8 w-8 text-[#0B214A]" />
              <h1 className="text-3xl font-bold text-gray-900">Video Analytics</h1>
            </div>
            {analytics && (
              <p className="text-gray-600">{analytics.videoTitle}</p>
            )}
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
        ) : analytics ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Watch Time</span>
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatWatchTime(analytics.totalWatchTime)}
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Play Count</span>
                  <Play className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{analytics.playCount}</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.completionRate.toFixed(1)}%
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Average Progress</span>
                  <Target className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatTime(Math.floor(analytics.averageProgress))}
                </p>
              </div>
            </div>

            {/* Drop-off Graph */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Drop-off Points</h3>
              <p className="text-sm text-gray-600 mb-4">
                Viewer retention at different points in the video
              </p>
              {analytics.dropOffPoints.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analytics.dropOffPoints}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="progress" 
                      label={{ value: 'Video Progress (seconds)', position: 'insideBottom', offset: -5 }}
                      tickFormatter={(value) => formatTime(value)}
                    />
                    <YAxis 
                      label={{ value: 'Viewer Count', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => `Progress: ${formatTime(value)}`}
                      formatter={(value: number) => [value, 'Viewers']}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#0B214A" 
                      strokeWidth={2} 
                      name="Viewers"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No drop-off data available yet</p>
                  <p className="text-sm mt-2">Data will appear as viewers watch this video</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No analytics data available</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

