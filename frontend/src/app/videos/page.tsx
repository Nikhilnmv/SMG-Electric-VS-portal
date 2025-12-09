'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { videoApi } from '@/lib/api';
import Link from 'next/link';
import { Play, Clock, Eye, User } from 'lucide-react';
import { Video } from '@vs-platform/types';

interface VideoWithUser extends Video {
  categoryRole?: string;
  user?: {
    id: string;
    email: string;
  };
}

export default function VideosPage() {
  const [videos, setVideos] = useState<VideoWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true);
        setError(null);
        const videoList = await videoApi.listVideosByCategory();
        console.log('Category videos API response:', videoList);
        setVideos(Array.isArray(videoList) ? videoList : []);
      } catch (err) {
        console.error('Error fetching category videos:', err);
        setError(err instanceof Error ? err.message : 'Failed to load videos');
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, []);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Category Videos</h1>
          <p className="text-gray-600">Watch videos uploaded by users in your category</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B214A]"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No videos found in your category</p>
            <Link
              href="/upload"
              className="inline-block bg-[#0B214A] text-white px-6 py-3 rounded-lg hover:bg-[#1a3d6b] transition-colors"
            >
              Upload Your First Video
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Link
                key={video.id}
                href={`/watch/${video.id}`}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-video bg-gray-100 relative">
                  {getThumbnailUrl(video.thumbnailUrl) ? (
                    <img
                      src={getThumbnailUrl(video.thumbnailUrl)!}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <Play className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(video.duration)}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">{video.title}</h3>
                    {video.categoryRole && (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full border border-blue-200 whitespace-nowrap">
                        {video.categoryRole}
                      </span>
                    )}
                  </div>
                  {video.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{video.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {video.user?.email || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Views
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {video.createdAt && new Date(video.createdAt).toLocaleDateString()}
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

