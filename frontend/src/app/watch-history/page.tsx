'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Clock, Calendar } from 'lucide-react';
import { videoApi } from '@/lib/api';

interface WatchHistoryItem {
  videoId: string;
  videoTitle: string;
  thumbnailUrl?: string;
  lastWatched: Date;
  progress: number;
  duration: number;
}

export default function WatchHistoryPage() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWatchHistory() {
      try {
        setLoading(true);
        const data = await videoApi.getWatchHistory();
        setHistory(data.map(item => ({
          videoId: item.videoId,
          videoTitle: item.videoTitle,
          thumbnailUrl: item.thumbnailUrl || undefined,
          lastWatched: new Date(item.lastWatched),
          progress: item.progress,
          duration: item.duration,
        })));
      } catch (error) {
        console.error('Failed to fetch watch history:', error);
        // On error, set empty history
        setHistory([]);
      } finally {
        setLoading(false);
      }
    }

    fetchWatchHistory();
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const formatProgress = (progress: number, duration: number) => {
    if (!duration || duration === 0) return '0%';
    const percent = (progress / duration) * 100;
    return `${Math.round(percent)}%`;
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

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Watch History</h1>
          <p className="text-gray-600">Continue watching from where you left off</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B214A]"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No watch history yet</p>
            <Link
              href="/my-videos"
              className="inline-block mt-4 text-[#0B214A] hover:underline"
            >
              Browse Videos
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <Link
                key={item.videoId}
                href={`/watch/${item.videoId}`}
                className="flex gap-4 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="w-48 h-28 bg-gray-200 rounded-lg flex-shrink-0 relative overflow-hidden">
                  {getThumbnailUrl(item.thumbnailUrl) ? (
                    <img
                      src={getThumbnailUrl(item.thumbnailUrl)!}
                      alt={item.videoTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 h-1">
                    <div
                      className="bg-blue-500 h-full"
                      style={{ width: `${item.duration > 0 ? (item.progress / item.duration) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {item.videoTitle}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(item.lastWatched)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatProgress(item.progress, item.duration)} watched
                    </span>
                  </div>
                  <div className="mt-3">
                    <span className="text-sm text-[#0B214A] font-medium">Resume Watching →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

