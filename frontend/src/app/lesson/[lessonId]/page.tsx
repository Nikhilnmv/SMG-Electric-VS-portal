'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import VideoPlayer from '@/components/VideoPlayer';
import { lessonApi, Lesson, analyticsApi } from '@/lib/api';
import { useFocusMode } from '@/hooks/useFocusMode';

export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params.lessonId as string;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [initialTime, setInitialTime] = useState(0);
  const [cursorHidden, setCursorHidden] = useState(false);
  const cursorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [completed, setCompleted] = useState(false);

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

  // Fetch lesson data
  useEffect(() => {
    let isMounted = true;
    
    async function fetchLesson() {
      try {
        setLoading(true);
        setError(null);
        const data = await lessonApi.getLesson(lessonId);
        
        if (!isMounted) return;
        
        setLesson(data);
        setCompleted(data.userProgress?.completed || false);

        // Get stream URL
        const streamData = await lessonApi.getStreamUrl(lessonId);
        const storageMode = process.env.NEXT_PUBLIC_STORAGE_MODE || 'local';
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        
        if (streamData.hlsUrl) {
          let fullHlsUrl: string;
          
          if (storageMode === 'local' && streamData.hlsUrl.startsWith('/uploads')) {
            // Local storage: use backend URL
            fullHlsUrl = `${API_URL}${streamData.hlsUrl}`;
          } else {
            // S3/CloudFront: use CloudFront URL or direct path
            const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUD_FRONT_URL || '';
            fullHlsUrl = cloudFrontUrl
              ? `${cloudFrontUrl}/${streamData.hlsUrl}`
              : streamData.hlsUrl;
          }
          
          setHlsUrl(fullHlsUrl);
        } else {
          setError('Lesson video is not ready for playback.');
        }

        // Check if user has progress
        if (data.userProgress && data.userProgress.progress > 0 && !data.userProgress.completed) {
          setShowResumePrompt(true);
          // Convert progress percentage to time (approximate)
          // This is a rough estimate - in production you'd want to track actual time
          setInitialTime(0); // Start from beginning for lessons
        }

        // Start focus session
        startSession();
      } catch (err: any) {
        if (!isMounted) return;
        
        console.error('Error fetching lesson:', err);
        if (err?.status === 403) {
          if (err.data?.requiredLessonId) {
            setError(`You must complete "${err.data.requiredLessonTitle}" before accessing this lesson.`);
          } else {
            setError('You do not have access to this lesson.');
          }
        } else if (err?.status === 400) {
          setError(err.message || 'Lesson is not ready for playback.');
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load lesson');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (lessonId) {
      fetchLesson();
    }
    
    return () => {
      isMounted = false;
    };
  }, [lessonId, startSession]);

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
    async (secondsWatched: number, duration: number) => {
      if (!lesson) return;

      // Clear existing debounce
      if (progressDebounceRef.current) {
        clearTimeout(progressDebounceRef.current);
      }

      // Debounce progress updates (save every 5 seconds)
      progressDebounceRef.current = setTimeout(async () => {
        try {
          const progressPercent = duration > 0 ? Math.round((secondsWatched / duration) * 100) : 0;
          const isCompleted = progressPercent >= 90; // Mark as completed at 90%

          await lessonApi.updateProgress(lessonId, {
            progress: progressPercent,
            completed: isCompleted,
          });

          if (isCompleted && !completed) {
            setCompleted(true);
            // Track completion event
            await analyticsApi.trackEvent(lessonId, 'VIDEO_COMPLETE', secondsWatched, undefined, true);
          }
        } catch (err) {
          console.error('Failed to update lesson progress:', err);
        }
      }, 5000);
    },
    [lesson, lessonId, completed]
  );

  // Handle video events
  const handlePlay = useCallback(async () => {
    if (!lesson) return;
    if (isActive) {
      await analyticsApi.trackEvent(lessonId, 'VIDEO_PLAY', undefined, undefined, true);
    }
  }, [lesson, lessonId, isActive]);

  const handlePause = useCallback(async () => {
    if (!lesson) return;
    if (isActive) {
      recordInterruption();
      await analyticsApi.trackEvent(lessonId, 'VIDEO_PAUSE', undefined, undefined, true);
    }
  }, [lesson, lessonId, isActive, recordInterruption]);

  const handleComplete = useCallback(async () => {
    if (!lesson) return;
    
    try {
      await lessonApi.updateProgress(lessonId, {
        progress: 100,
        completed: true,
      });
      setCompleted(true);
      await analyticsApi.trackEvent(lessonId, 'VIDEO_COMPLETE', undefined, undefined, true);
    } catch (err) {
      console.error('Failed to mark lesson as completed:', err);
    }
  }, [lesson, lessonId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
      if (progressDebounceRef.current) {
        clearTimeout(progressDebounceRef.current);
      }
    };
  }, [endSession]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading lesson...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <p className="text-red-600 mb-4">{error || 'Lesson not found'}</p>
          <button
            onClick={() => router.push('/modules')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Modules
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-black ${cursorHidden ? 'cursor-none' : ''}`}>
      {showResumePrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Resume Lesson?</h3>
            <p className="text-gray-600 mb-4">You have progress on this lesson. Would you like to continue from where you left off?</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResumePrompt(false);
                  setInitialTime(0);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Start Over
              </button>
              <button
                onClick={() => setShowResumePrompt(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative">
        {hlsUrl && (
          <VideoPlayer
            src={hlsUrl}
            lessonId={lessonId}
            title={lesson.title}
            onProgress={handleProgressUpdate}
            onPlay={handlePlay}
            onPause={handlePause}
            onComplete={handleComplete}
            initialTime={initialTime}
          />
        )}

        {/* Lesson info overlay */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="bg-black bg-opacity-50 rounded-lg p-4 text-white">
            <h1 className="text-xl font-semibold mb-1">{lesson.title}</h1>
            {lesson.description && (
              <p className="text-sm text-gray-300">{lesson.description}</p>
            )}
            {completed && (
              <div className="mt-2 flex items-center gap-2 text-green-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Completed</span>
              </div>
            )}
          </div>
        </div>

        {/* Focus mode stats */}
        {isActive && (
          <div className="absolute bottom-4 right-4 z-10 bg-black bg-opacity-50 rounded-lg p-3 text-white text-sm">
            <div>Session: {formatDuration(sessionDuration)}</div>
            {interruptions > 0 && (
              <div className="text-yellow-400">Interruptions: {interruptions}</div>
            )}
          </div>
        )}
      </div>

      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 z-20 bg-black bg-opacity-50 text-white px-4 py-2 rounded hover:bg-opacity-75"
      >
        ← Back
      </button>
    </div>
  );
}

