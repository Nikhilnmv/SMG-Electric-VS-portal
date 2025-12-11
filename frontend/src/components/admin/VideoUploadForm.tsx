'use client';

import { useState } from 'react';
import { Loader2, Upload } from 'lucide-react';

interface VideoUploadFormProps {
  lessonId: string;
  lessonTitle: string;
  onUpload: (lessonId: string, formData: FormData) => Promise<void>;
  onCancel: () => void;
  uploading: boolean;
}

export default function VideoUploadForm({
  lessonId,
  lessonTitle,
  onUpload,
  onCancel,
  uploading,
}: VideoUploadFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const url = URL.createObjectURL(file);
      setThumbnailPreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) {
      alert('Please select a video file');
      return;
    }

    const formData = new FormData();
    formData.append('video', videoFile);
    if (thumbnailFile) {
      formData.append('thumbnail', thumbnailFile);
    }

    await onUpload(lessonId, formData);
    
    // Cleanup
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setVideoFile(null);
    setThumbnailFile(null);
    setVideoPreview(null);
    setThumbnailPreview(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Video File <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept="video/*"
          onChange={handleVideoChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
          required
        />
        {videoPreview && (
          <div className="mt-2">
            <video src={videoPreview} controls className="max-w-full h-48 rounded-lg" />
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Thumbnail Image (Optional)
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleThumbnailChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B214A]"
        />
        {thumbnailPreview && (
          <div className="mt-2">
            <img src={thumbnailPreview} alt="Thumbnail preview" className="max-w-full h-32 rounded-lg object-cover" />
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={uploading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={uploading || !videoFile}
          className="px-4 py-2 text-sm font-medium text-white bg-[#0B214A] rounded-lg hover:bg-[#0a1a3a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload Video
            </>
          )}
        </button>
      </div>
    </form>
  );
}
