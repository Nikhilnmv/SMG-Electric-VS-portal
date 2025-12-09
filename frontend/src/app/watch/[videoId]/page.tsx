'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { videoApi, analyticsApi } from '@/lib/api';
import { useFocusMode } from '@/hooks/useFocusMode';
import { Video } from '@vs-platform/types';

interface VideoWithProgress {
  video: Video & {
    renditions?: Array<{
      id: string;
      resolution: string;
      bitrate: number;
      hlsPath: string;
    }>;
  };
  userProgress: number | null;
}

export default function WatchPage({ params }: { params: { videoId: string } }) {
  const router = useRouter();
  const [videoData, setVideoData] = useState<VideoWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [cursorHidden, setCursorHidden] = useState(false);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const {
    sessionStartTime,
    sessionDuration,
    interruptions,
    isActive,
    startSession,
    endSession,
    recordInterruption,
    formatDuration,
  } = useFocusMode();

  // Fetch video data
  useEffect(() => {
    let isMounted = true;
    
    async function fetchVideo() {
      try {
        setLoading(true);
        setError(null);
        const data = await videoApi.getVideo(params.videoId);
        
        if (!isMounted) return;
        
        setVideoData(data);

        // Construct HLS URL
        const storageMode = process.env.NEXT_PUBLIC_STORAGE_MODE || 'local';
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        if (data.video.hlsPath) {
          let fullHlsUrl: string;
          
          if (storageMode === 'local' && data.video.hlsPath.startsWith('/uploads')) {
            // Local storage: use backend URL
            fullHlsUrl = `${API_URL}${data.video.hlsPath}`;
            console.log(`[WatchPage] Constructed HLS URL for local storage: ${fullHlsUrl}`);
          } else {
            // S3/CloudFront: use CloudFront URL or direct path
            const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUD_FRONT_URL || '';
            fullHlsUrl = cloudFrontUrl
              ? `${cloudFrontUrl}/${data.video.hlsPath}`
              : data.video.hlsPath;
            console.log(`[WatchPage] Constructed HLS URL for S3: ${fullHlsUrl}`);
          }
          
          setHlsUrl(fullHlsUrl);
        } else {
          console.error(`[WatchPage] Video has no hlsPath. Status: ${data.video.status}`);
          setError(`Video is not ready for playback. Status: ${data.video.status}`);
        }

        // Check if user has progress
        if (data.userProgress !== null && data.userProgress > 0) {
          setShowResumePrompt(true);
          setInitialTime(data.userProgress);
        }

        // Start focus session
        startSession();
      } catch (err: any) {
        if (!isMounted) return;
        
        console.error('Error fetching video:', err);
        if (err?.status === 403) {
          setError('You do not have access to this video. It belongs to a different category.');
        } else if (err?.status === 400) {
          // Video not ready for playback
          setError(err.message || 'Video is not ready for playback. Please wait for processing to complete.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load video');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchVideo();
    
    return () => {
      isMounted = false;
    };
  }, [params.videoId, startSession]);

  // Handle cursor auto-hide
  useEffect(() => {
    const handleMouseMove = () => {
      setCursorHidden(false);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      cursorTimeoutRef.current = setTimeout(() => {
        setCursorHidden(true);
      }, 3000);
    };

    if (isActive) {
      document.addEventListener('mousemove', handleMouseMove);
      cursorTimeoutRef.current = setTimeout(() => {
        setCursorHidden(true);
      }, 3000);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, [isActive]);

  // Handle progress updates with debounce
  const handleProgressUpdate = useCallback(
    (secondsWatched: number) => {
      if (!videoData || !isActive) return;

      // Debounce progress updates
      if (progressDebounceRef.current) {
        clearTimeout(progressDebounceRef.current);
      }

      progressDebounceRef.current = setTimeout(async () => {
        try {
          await videoApi.updateProgress(params.videoId, secondsWatched);
        } catch (err) {
          console.error('Error updating progress:', err);
        }
      }, 2000); // 2 second debounce
    },
    [params.videoId, videoData, isActive]
  );

  // Handle video end - log focus session completion
  const handleVideoEnd = useCallback(async () => {
    if (isActive && sessionStartTime && videoData) {
      // Log COMPLETE event with focus session metadata
      try {
        const deviceInfo = typeof navigator !== 'undefined' 
          ? `${navigator.userAgent} | ${navigator.platform}`
          : '';
        const metadata = JSON.stringify({
          focusSessionDuration: sessionDuration,
          interruptions,
          sessionStartTime: sessionStartTime.toISOString(),
        });
        await analyticsApi.trackEvent(
          params.videoId,
          'COMPLETE',
          videoData.video.duration || undefined,
          `${deviceInfo} | ${metadata}`
        );
      } catch (err) {
        console.error('Error logging focus session:', err);
      }
      
      // Update progress to 100% when video completes
      if (videoData.video.duration) {
        try {
          await videoApi.updateProgress(params.videoId, videoData.video.duration);
        } catch (err) {
          console.error('Error updating progress to 100%:', err);
        }
      }
      
      endSession();
    } else if (videoData) {
      // Log COMPLETE event even if not in focus mode
      try {
        await analyticsApi.trackEvent(
          params.videoId,
          'COMPLETE',
          videoData.video.duration || undefined
        );
      } catch (err) {
        console.error('Error logging video completion:', err);
      }
      
      // Update progress to 100% when video completes
      if (videoData.video.duration) {
        try {
          await videoApi.updateProgress(params.videoId, videoData.video.duration);
        } catch (err) {
          console.error('Error updating progress to 100%:', err);
        }
      }
    }
  }, [isActive, sessionStartTime, sessionDuration, interruptions, videoData, params.videoId, endSession]);

  // Handle resume prompt
  const handleResume = () => {
    setShowResumePrompt(false);
  };

  const handleStartFromBeginning = () => {
    setShowResumePrompt(false);
    setInitialTime(0);
  };

  // Handle exit focus mode
  const handleExitFocusMode = () => {
    endSession();
    router.push('/');
  };

  // Handle interruptions (e.g., tab switching, window blur)
  useEffect(() => {
    const handleBlur = () => {
      if (isActive) {
        recordInterruption();
      }
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, recordInterruption]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !videoData || !hlsUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Video not found'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-black text-white ${
        cursorHidden ? 'cursor-none' : ''
      }`}
    >
      {/* Focus Mode Overlay - Dimmed UI */}
      <div className="fixed inset-0 bg-black/30 pointer-events-none z-10"></div>

      {/* Main Content */}
      <div className="relative z-20">
        {/* Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExitFocusMode}
              className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 rounded transition-colors"
            >
              Exit Focus Mode
            </button>
            {isActive && (
              <div className="text-sm text-gray-300">
                Session: {formatDuration(sessionDuration)}
              </div>
            )}
          </div>
        </div>

        {/* Video Player Container */}
        <div className="w-full pt-16 pb-8">
          <div className="max-w-7xl mx-auto px-4">
            <VideoPlayer
              src={hlsUrl}
              videoId={params.videoId}
              autoplay={!showResumePrompt}
              onProgressUpdate={handleProgressUpdate}
              onVideoEnd={handleVideoEnd}
              initialTime={initialTime}
              isFocusMode={isActive}
              onFocusStart={startSession}
              onFocusEnd={endSession}
            />
          </div>
        </div>

        {/* Video Info */}
        <div className="max-w-7xl mx-auto px-4 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{videoData.video.title}</h1>
            {(() => {
              const categoryRole = 'categoryRole' in videoData.video ? (videoData.video as any).categoryRole : null;
              return categoryRole ? (
                <span className="px-3 py-1 text-xs font-semibold bg-blue-600/20 text-blue-300 rounded-full border border-blue-500/30">
                  {categoryRole}
                </span>
              ) : null;
            })()}
          </div>
          {videoData.video.description && (
            <p className="text-gray-400">{videoData.video.description}</p>
          )}
        </div>
      </div>

      {/* Resume Prompt Modal */}
      {showResumePrompt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Resume Watching?</h2>
            <p className="text-gray-400 mb-6">
              You were watching this video. Would you like to resume from where you left off?
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleResume}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Resume
              </button>
              <button
                onClick={handleStartFromBeginning}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                Start from Beginning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

