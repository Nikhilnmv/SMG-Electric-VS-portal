'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { Shield, Users, Video, Clock, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { adminApi, AdminStats } from '@/lib/api';
import Link from 'next/link';

export default function AdminDashboardPage() {
  useRequireAdmin();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const statsData = await adminApi.getStats();
      setStats(statsData);
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      const errorMessage = err?.message || 'Failed to load statistics. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-[#0B214A]" />
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <p className="text-gray-600">Overview of platform statistics and management</p>
          </div>
          <button
            onClick={() => fetchStats(true)}
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
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Link href="/admin/users" className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Users</span>
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                <p className="text-xs text-gray-500 mt-2">View all users →</p>
              </Link>

              <Link href="/admin/videos" className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Total Videos</span>
                  <Video className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.totalVideos || 0}</p>
                <p className="text-xs text-gray-500 mt-2">Manage videos →</p>
              </Link>

              <Link href="/admin/videos" className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Pending Approvals</span>
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.pendingApprovals || 0}</p>
                <p className="text-xs text-gray-500 mt-2">Review pending →</p>
              </Link>

              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Completed Videos</span>
                  <CheckCircle2 className="h-5 w-5 text-teal-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats?.completedVideos || 0}</p>
                <p className="text-xs text-gray-500 mt-2">Ready & approved</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                href="/admin/videos"
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Video className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Video Moderation</h3>
                    <p className="text-sm text-gray-600">Approve or reject videos</p>
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
