'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { videoApi } from '@/lib/api';
import Link from 'next/link';
import { Play, Clock, Eye, Trash2 } from 'lucide-react';
import { Video } from '@vs-platform/types';

export default function MyVideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideos() {
      try {
        setLoading(true);
        setError(null);
        const videoList = await videoApi.myVideos();
        console.log('My videos API response:', videoList);
        setVideos(Array.isArray(videoList) ? videoList : []);
      } catch (err) {
        console.error('Error fetching my videos:', err);
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

  const handleDelete = async (videoId: string, videoTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${videoTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(videoId);
      await videoApi.deleteVideo(videoId);
      
      // Remove video from list
      setVideos(videos.filter(v => v.id !== videoId));
    } catch (err) {
      console.error('Error deleting video:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete video');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Videos</h1>
          <p className="text-gray-600">Manage and view all your uploaded videos</p>
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
            <p className="text-gray-500 mb-4">No videos found</p>
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
              <div
                key={video.id}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow relative group"
              >
                <Link href={`/watch/${video.id}`} className="block">
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
                </Link>
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
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className={`capitalize px-2 py-1 rounded ${
                      video.status === 'APPROVED' || video.status === 'READY' 
                        ? 'bg-green-100 text-green-700' 
                        : video.status === 'PROCESSING' 
                        ? 'bg-yellow-100 text-yellow-700'
                        : video.status === 'REJECTED'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {video.status === 'READY' ? 'Ready' : video.status.toLowerCase()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Views
                    </span>
                  </div>
                  {video.status === 'PROCESSING' && (
                    <p className="text-xs text-yellow-600 mt-1">Processing video...</p>
                  )}
                  {video.status === 'UPLOADED' && (
                    <p className="text-xs text-blue-600 mt-1">Uploaded, waiting for processing...</p>
                  )}
                  {!video.hlsPath && (video.status === 'READY' || video.status === 'APPROVED') && (
                    <p className="text-xs text-orange-600 mt-1">Video processing may not be complete</p>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(video.id, video.title);
                      }}
                      disabled={deletingId === video.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === video.id ? 'Deleting...' : 'Delete Video'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

