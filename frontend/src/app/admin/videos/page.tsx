'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useEffect, useState } from 'react';
import { Video, RefreshCw, AlertCircle, Loader2, CheckCircle, XCircle, Eye, Clock, Play, X } from 'lucide-react';
import { useRequireAdmin } from '@/hooks/useRequireAdmin';
import { adminApi, PendingVideo, videoApi } from '@/lib/api';
import Link from 'next/link';
import VideoPlayer from '@/components/VideoPlayer';

export default function AdminVideosPage() {
  useRequireAdmin();

  const [pendingVideos, setPendingVideos] = useState<PendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingVideo, setProcessingVideo] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [previewVideo, setPreviewVideo] = useState<{ id: string; title: string; hlsUrl: string | null } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const fetchVideos = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setNotification(null);

      const videosData = await adminApi.getPendingVideos();
      setPendingVideos(videosData);
    } catch (err: any) {
      console.error('Error fetching videos:', err);
      const errorMessage = err?.message || 'Failed to load videos. Please try again.';
      setError(errorMessage);
      setNotification({ type: 'error', message: errorMessage });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleApprove = async (videoId: string) => {
    try {
      setProcessingVideo(videoId);
      const video = pendingVideos.find((v) => v.id === videoId);
      await adminApi.approveVideo(videoId);
      
      // Optimistic update
      setPendingVideos((prev) => prev.filter((v) => v.id !== videoId));
      
      showNotification('success', `Video "${video?.title || 'Unknown'}" has been approved successfully.`);
    } catch (err: any) {
      console.error('Error approving video:', err);
      const errorMessage = err?.message || 'Failed to approve video. Please try again.';
      showNotification('error', errorMessage);
    } finally {
      setProcessingVideo(null);
    }
  };

  const handleReject = async (videoId: string) => {
    if (!confirm('Are you sure you want to reject this video?')) {
      return;
    }

    const deleteFromStorage = confirm('Do you also want to delete the video files from storage?');

    try {
      setProcessingVideo(videoId);
      const video = pendingVideos.find((v) => v.id === videoId);
      const response = await adminApi.rejectVideo(videoId, deleteFromStorage);
      
      // Optimistic update
      setPendingVideos((prev) => prev.filter((v) => v.id !== videoId));
      
      // Show success message, including warning if storage deletion had issues
      const message = response.warning 
        ? `Video "${video?.title || 'Unknown'}" has been rejected. ${response.warning}`
        : `Video "${video?.title || 'Unknown'}" has been rejected.${deleteFromStorage ? ' Files deleted from storage.' : ''}`;
      showNotification('success', message);
    } catch (err: any) {
      console.error('Error rejecting video:', err);
      const errorMessage = err?.message || err?.data?.error || 'Failed to reject video. Please try again.';
      showNotification('error', errorMessage);
    } finally {
      setProcessingVideo(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      UPLOADED: { label: 'Uploaded', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
      PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-800 border-blue-200' },
      READY: { label: 'Ready', color: 'bg-teal-100 text-teal-800 border-teal-200' },
      APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800 border-green-200' },
      REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handlePreview = async (videoId: string, videoTitle: string) => {
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      
      // Fetch video data to get HLS path
      const videoData = await videoApi.getVideo(videoId);
      
      if (!videoData.video.hlsPath) {
        const status = videoData.video.status;
        let message = 'Video is still processing. HLS files are not yet available.';
        if (status === 'PROCESSING') {
          message = 'Video is currently being transcoded. Please wait for processing to complete before previewing.';
        } else if (status === 'UPLOADED') {
          message = 'Video has been uploaded but transcoding has not started yet. Please wait.';
        }
        setPreviewError(message);
        setPreviewLoading(false);
        return;
      }

      // Construct HLS URL
      const storageMode = process.env.NEXT_PUBLIC_STORAGE_MODE || 'local';
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      let fullHlsUrl: string;
      
      if (storageMode === 'local' && videoData.video.hlsPath.startsWith('/uploads')) {
        // Local storage: use backend URL
        fullHlsUrl = `${API_URL}${videoData.video.hlsPath}`;
      } else {
        // S3/CloudFront: use CloudFront URL or direct path
        const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUD_FRONT_URL || '';
        fullHlsUrl = cloudFrontUrl
          ? `${cloudFrontUrl}/${videoData.video.hlsPath}`
          : videoData.video.hlsPath;
      }
      
      setPreviewVideo({
        id: videoId,
        title: videoTitle,
        hlsUrl: fullHlsUrl,
      });
      setPreviewLoading(false);
    } catch (err: any) {
      console.error('Error loading video preview:', err);
      setPreviewError(err?.message || 'Failed to load video preview');
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setPreviewVideo(null);
    setPreviewError(null);
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Video className="h-8 w-8 text-[#0B214A]" />
              <h1 className="text-3xl font-bold text-gray-900">Video Moderation</h1>
            </div>
            <p className="text-gray-600">Review and moderate video uploads</p>
          </div>
          <button
            onClick={() => fetchVideos(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`border px-4 py-3 rounded-lg flex items-center justify-between gap-2 ${
              notification.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Banner */}
        {error && !notification && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-100 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Videos Pending Review</h2>
                {pendingVideos.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {pendingVideos.length} video{pendingVideos.length !== 1 ? 's' : ''} pending
                  </span>
                )}
              </div>
              {pendingVideos.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Video className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No videos pending review</h3>
                  <p className="text-gray-500 mb-4">All videos have been reviewed or there are no videos yet.</p>
                  <button
                    onClick={() => fetchVideos(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0B214A] bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thumbnail
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Title
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Uploaded By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Upload Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingVideos.map((video) => (
                        <tr key={video.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="h-16 w-28 bg-gray-200 rounded flex items-center justify-center">
                              <Video className="h-8 w-8 text-gray-400" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{video.title}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(video.status)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{video.userEmail}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{formatDate(video.uploadDate)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handlePreview(video.id, video.title)}
                                disabled={processingVideo === video.id || previewLoading || video.status === 'PROCESSING' || !video.hlsPath}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={video.status === 'PROCESSING' ? 'Video is still processing. Preview will be available once transcoding completes.' : !video.hlsPath ? 'HLS files not available yet' : 'Preview video'}
                              >
                                {previewLoading && previewVideo?.id === video.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                                Preview
                              </button>
                              <button
                                onClick={() => handleApprove(video.id)}
                                disabled={processingVideo === video.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={video.status === 'PROCESSING' ? 'Video will be approved once transcoding completes' : 'Approve video'}
                              >
                                {processingVideo === video.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(video.id)}
                                disabled={processingVideo === video.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingVideo === video.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Video Preview Modal */}
        {previewVideo && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{previewVideo.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">Video Preview</p>
                </div>
                <button
                  onClick={closePreview}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-auto p-6">
                {previewError ? (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      <span>{previewError}</span>
                    </div>
                  </div>
                ) : previewVideo.hlsUrl ? (
                  <div className="w-full">
                    <VideoPlayer
                      src={previewVideo.hlsUrl}
                      videoId={previewVideo.id}
                      autoplay={false}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Loading video preview...</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={closePreview}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    closePreview();
                    handleApprove(previewVideo.id);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Video
                </button>
                <button
                  onClick={() => {
                    closePreview();
                    handleReject(previewVideo.id);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Video
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

