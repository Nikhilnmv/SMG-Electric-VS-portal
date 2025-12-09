'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';

// Simple UUID v4 generator (for client-side use)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedThumbnail, setSelectedThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const storageMode = process.env.NEXT_PUBLIC_STORAGE_MODE || 'local';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file');
        return;
      }
      setSelectedFile(file);
      setError(null);
      // Auto-fill title if empty
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file for thumbnail');
        return;
      }
      setSelectedThumbnail(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('vs_platform_token');
  };

  const handleUpload = async () => {
    // Prevent double submission
    if (isUploading) {
      return;
    }

    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setError('Please log in to upload videos');
      router.push('/login');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      if (storageMode === 'local') {
        // Local storage mode: direct file upload
        await handleLocalUpload(API_URL, token);
      } else {
        // S3 mode: presigned URL upload
        await handleS3Upload(API_URL, token);
      }
    } catch (err) {
      console.error('Upload error:', err);
      
      let errorMessage = 'Upload failed';
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Provide more helpful error messages
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Network error: Could not connect to server. Please check if the backend is running on port 3001.';
        } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          errorMessage = 'Authentication failed. Please log in again.';
          localStorage.removeItem('vs_platform_token');
          setTimeout(() => router.push('/login'), 2000);
        } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
          errorMessage = 'Access denied. Please check your account permissions.';
        } else if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
          errorMessage = 'Server error: Please check backend logs for details.';
        }
      }
      
      setError(errorMessage);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleLocalUpload = async (API_URL: string, token: string) => {
    // Generate videoId upfront to prevent duplicate uploads
    const videoId = generateUUID();
    console.log(`[Upload] Generated videoId: ${videoId}`);
    
    // Step 1: Upload file and thumbnail directly
    const formData = new FormData();
    formData.append('video', selectedFile!);
    if (selectedThumbnail) {
      formData.append('thumbnail', selectedThumbnail);
    }
    // Pass videoId to ensure consistent ID usage
    formData.append('videoId', videoId);

    const uploadResponse = await fetch(`${API_URL}/api/videos/upload-local`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to upload file');
    }

    const uploadData = await uploadResponse.json();
    if (!uploadData.success || !uploadData.data) {
      throw new Error(uploadData.error || 'Invalid response from server');
    }

    // Use the videoId we generated (server should return the same one)
    const { filePath, thumbnailPath } = uploadData.data;
    setUploadProgress(50);

    // Step 2: Register video in database
    const registerResponse = await fetch(`${API_URL}/api/videos/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        filePath,
        videoId, // Use the videoId we generated earlier
        thumbnailUrl: thumbnailPath || null,
      }),
    });

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json();
      throw new Error(errorData.error || 'Failed to register video');
    }

    setUploadProgress(100);
    setSuccess(true);
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  const handleS3Upload = async (API_URL: string, token: string) => {
    // Step 1: Get presigned URL
    const uploadUrlResponse = await fetch(`${API_URL}/api/upload/presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        contentType: selectedFile!.type,
        fileSize: selectedFile!.size,
      }),
    });

    if (!uploadUrlResponse.ok) {
      let errorMessage = 'Failed to get upload URL';
      try {
        const errorData = await uploadUrlResponse.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = uploadUrlResponse.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const responseData = await uploadUrlResponse.json();
    
    if (!responseData.success || !responseData.data) {
      throw new Error(responseData.error || 'Invalid response from server');
    }

    const { uploadUrl, fileKey } = responseData.data;
    
    if (!uploadUrl || !fileKey) {
      throw new Error('Invalid upload URL or file key received from server');
    }

    // Step 2: Upload file to S3
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': selectedFile!.type,
      },
      body: selectedFile!,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file to S3');
    }

    setUploadProgress(100);

    // Step 3: Register video in database
    const registerResponse = await fetch(`${API_URL}/api/videos/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        fileKey,
      }),
    });

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json();
      throw new Error(errorData.error || 'Failed to register video');
    }

    setSuccess(true);
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  return (
    <MainLayout>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Upload Video</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <div className="font-medium mb-1">Upload Error</div>
          <div className="text-sm">{error}</div>
          <div className="text-xs text-red-600 mt-2">
            Tip: Check browser console (F12) for detailed error information
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          Video uploaded successfully! Redirecting...
        </div>
      )}

      <div className="space-y-6">
        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Video File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
          {storageMode === 'local' && (
            <p className="mt-1 text-xs text-gray-500">
              Storage mode: Local (files saved to backend/uploads/)
            </p>
          )}
        </div>

        {/* Thumbnail Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Thumbnail Image (Optional)</label>
          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            onChange={handleThumbnailSelect}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {selectedThumbnail && (
            <div className="mt-2">
              <p className="text-sm text-gray-600 mb-2">
                Selected: {selectedThumbnail.name} ({(selectedThumbnail.size / 1024).toFixed(2)} KB)
              </p>
              {thumbnailPreview && (
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden max-w-xs">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full h-auto"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isUploading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
            placeholder="Enter video title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isUploading}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
            placeholder="Enter video description (optional)"
          />
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={isUploading || !selectedFile || !title.trim()}
            className="w-full bg-[#0B214A] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1a3d6b] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </div>
      </div>
    </MainLayout>
  );
}
