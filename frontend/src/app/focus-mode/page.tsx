'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { videoApi } from '@/lib/api';
import { Video } from '@vs-platform/types';
import { Focus, Play, Target, Clock } from 'lucide-react';
import Link from 'next/link';

export default function FocusModePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const data = await videoApi.listVideos();
        setVideos(data);
      } catch (error) {
        console.error('Error fetching videos:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
  }, []);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Focus className="h-8 w-8 text-[#0B214A]" />
            <h1 className="text-3xl font-bold text-gray-900">Focus Mode</h1>
          </div>
          <p className="text-gray-600">
            Distraction-free video watching experience designed to help you stay focused
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Target className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h2 className="font-semibold text-gray-900 mb-2">What is Focus Mode?</h2>
              <p className="text-gray-700 text-sm mb-4">
                Focus Mode provides a minimal, distraction-free viewing experience. When you enter
                Focus Mode:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                <li>Interface elements are minimized</li>
                <li>Cursor auto-hides after inactivity</li>
                <li>Focus session tracking</li>
                <li>Interruption monitoring</li>
                <li>Task-based video consumption</li>
              </ul>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B214A]"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12">
            <Focus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No videos available for Focus Mode</p>
            <Link
              href="/modules"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B214A] text-white rounded-lg hover:bg-[#0A1A3A] transition-colors"
            >
              Browse Modules
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Link
                key={video.id}
                href={`/watch/${video.id}`}
                className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-video bg-gray-100 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="h-12 w-12 text-gray-400 group-hover:text-[#0B214A] transition-colors" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {video.title}
                  </h3>
                  {video.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {video.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#0B214A] text-white rounded-lg hover:bg-[#0A1A3A] transition-colors text-sm">
                      <Focus className="h-4 w-4" />
                      Start Focus Session
                    </button>
                    {video.duration && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                      </div>
                    )}
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

