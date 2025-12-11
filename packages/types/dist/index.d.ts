export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}
export type UserRole = 'ADMIN' | 'EDITOR' | 'USER' | 'admin' | 'editor' | 'user';
export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}
export interface Video {
    id: string;
    title: string;
    description?: string;
    status: VideoStatus;
    duration?: number;
    thumbnailUrl?: string;
    hlsManifestUrl?: string;
    s3Key: string;
    uploadedBy: string;
    createdAt: Date;
    updatedAt: Date;
    publishedAt?: Date;
}
export type VideoStatus = 'UPLOADED' | 'PROCESSING' | 'READY' | 'APPROVED' | 'uploading' | 'processing' | 'review' | 'approved' | 'published' | 'rejected';
export interface VideoMetadata {
    videoId: string;
    width: number;
    height: number;
    duration: number;
    bitrate: number;
    codec: string;
    format: string;
}
export interface PresignedUploadUrl {
    url: string;
    key: string;
    expiresIn: number;
}
export interface UploadRequest {
    fileName: string;
    fileSize: number;
    contentType: string;
}
export interface TranscodingJob {
    id: string;
    videoId: string;
    status: TranscodingStatus;
    progress: number;
    error?: string;
    createdAt: Date;
    completedAt?: Date;
}
export type TranscodingStatus = 'pending' | 'processing' | 'completed' | 'failed';
export interface HLSRendition {
    resolution: string;
    bitrate: number;
    playlistUrl: string;
}
export interface PlaybackSession {
    id: string;
    userId: string;
    videoId: string;
    currentTime: number;
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface AnalyticsEvent {
    id: string;
    userId?: string;
    videoId: string;
    eventType: AnalyticsEventType;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}
export type AnalyticsEventType = 'PLAY' | 'PAUSE' | 'PROGRESS' | 'COMPLETE' | 'play' | 'pause' | 'seek' | 'complete' | 'dropoff' | 'quality_change' | 'speed_change';
export interface Task {
    id: string;
    title: string;
    description?: string;
    videoIds: string[];
    timeBox?: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface TaskPlaylist {
    taskId: string;
    videos: Video[];
    currentIndex: number;
    timeRemaining?: number;
}
export interface ModerationAction {
    id: string;
    videoId: string;
    action: 'approve' | 'reject' | 'request_changes';
    performedBy: string;
    notes?: string;
    createdAt: Date;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export interface LiveStream {
    id: string;
    title: string;
    description?: string;
    status: LiveStreamStatus;
    rtmpIngestUrl: string;
    hlsPlaybackUrl?: string;
    scheduledStart?: Date;
    startedAt?: Date;
    endedAt?: Date;
    createdBy: string;
    createdAt: Date;
}
export type LiveStreamStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';
export interface ApiError {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
}
//# sourceMappingURL=index.d.ts.map