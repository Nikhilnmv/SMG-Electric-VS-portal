// API client utilities
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const tokenKey = process.env.NEXT_PUBLIC_JWT_STORAGE_KEY || 'vs_platform_token';
  return localStorage.getItem(tokenKey);
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || errorData.message || `API request failed: ${response.statusText}`;
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).data = errorData;
      console.error(`API Error [${response.status}]:`, endpoint, errorMessage, errorData);
      throw error;
    }

    return response.json();
  } catch (error: any) {
    // Enhanced error logging
    if (error.message && !error.message.includes('API request failed')) {
      console.error('Network or parsing error:', endpoint, error);
    }
    throw error;
  }
}

// Video API functions
export const videoApi = {
  getVideo: async (id: string) => {
    const response = await apiRequest<{ success: boolean; data: { video: any; userProgress: number | null } }>(`/api/videos/${id}`);
    return response.data;
  },
  listVideos: async () => {
    const response = await apiRequest<{ success: boolean; data: any[] }>('/api/videos');
    return response.data;
  },
  updateProgress: async (videoId: string, progressSeconds: number) => {
    const response = await apiRequest<{ success: boolean; data: { progressSeconds: number } }>(`/api/videos/${videoId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ progressSeconds }),
    });
    return response.data;
  },
  deleteVideo: async (videoId: string) => {
    const response = await apiRequest<{ success: boolean; message?: string }>(`/api/videos/${videoId}`, {
      method: 'DELETE',
    });
    return response;
  },
  getWatchHistory: async () => {
    const response = await apiRequest<{ success: boolean; data: Array<{
      videoId: string;
      videoTitle: string;
      thumbnailUrl?: string | null;
      progress: number;
      duration: number;
      lastWatched: string;
    }> }>('/api/videos/watch-history');
    return response.data;
  },
};

// Analytics API functions
export const analyticsApi = {
  trackEvent: async (
    videoIdOrLessonId: string, 
    eventType: string, 
    progressSeconds?: number, 
    deviceInfo?: string,
    isLesson: boolean = false
  ) => {
    const body: any = {
      eventType,
      currentTime: progressSeconds,
      device: deviceInfo,
    };
    
    if (isLesson) {
      body.lessonId = videoIdOrLessonId;
    } else {
      body.videoId = videoIdOrLessonId;
    }
    
    const response = await apiRequest<{ success: boolean }>('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return response;
  },
  getOverview: async () => {
    const response = await apiRequest<{ success: boolean; data: any }>('/api/admin/analytics/overview');
    return response.data;
  },
  getVideoAnalytics: async (videoId: string) => {
    const response = await apiRequest<{ success: boolean; data: any }>(`/api/analytics/video/${videoId}`);
    return response.data;
  },
  getUserAnalytics: async (userId: string) => {
    const response = await apiRequest<{ success: boolean; data: any }>(`/api/analytics/user/${userId}`);
    return response.data;
  },
  getAdminDashboard: async () => {
    const response = await apiRequest<{ success: boolean; data: any }>('/api/analytics/dashboard/admin');
    return response.data;
  },
  getUserDashboard: async () => {
    const response = await apiRequest<{ success: boolean; data: any }>('/api/analytics/dashboard/user');
    return response.data;
  },
  getFocusAnalytics: async () => {
    const response = await apiRequest<{ success: boolean; data: any }>('/api/admin/analytics/focus');
    return response.data;
  },
};

// Admin API functions
export interface AdminUser {
  id: string;
  email: string;
  username?: string | null;
  role: string;
  categoryRole?: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalVideos: number;
  completedVideos: number;
  pendingApprovals: number;
}

export const adminApi = {
  getUsers: async () => {
    const response = await apiRequest<{ success: boolean; data: AdminUser[] }>('/api/admin/users');
    return response.data;
  },

  getStats: async () => {
    const response = await apiRequest<{ success: boolean; data: AdminStats }>('/api/admin/stats');
    return response.data;
  },

  updateUserRole: async (userId: string, role: 'ADMIN' | 'USER' | 'EDITOR') => {
    const response = await apiRequest<{ success: boolean; data: AdminUser; message?: string }>(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    return response;
  },

  createUser: async (payload: {
    email: string;
    name?: string;
    password?: string;
    categoryRole?: string;
    role?: 'ADMIN' | 'USER' | 'EDITOR';
    generateUsername?: boolean;
    generateTempPassword?: boolean;
    sendCredentialsEmail?: boolean;
  }) => {
    const response = await apiRequest<{ 
      success: boolean; 
      data: { 
        user: AdminUser & { username?: string | null; passwordMustChange?: boolean }; 
        password?: string;
      }; 
      message?: string;
    }>('/api/admin/users/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response;
  },

  updateUserCategory: async (userId: string, categoryRole: string) => {
    const response = await apiRequest<{ success: boolean; data: AdminUser; message?: string }>(`/api/admin/users/${userId}/category`, {
      method: 'PATCH',
      body: JSON.stringify({ categoryRole }),
    });
    return response;
  },

  sendUserCredentialsEmail: async (userId: string) => {
    const response = await apiRequest<{ success: boolean; message?: string }>(`/api/admin/users/${userId}/send-credentials`, {
      method: 'POST',
    });
    return response;
  },

  getUserInitialPassword: async (userId: string) => {
    const response = await apiRequest<{ success: boolean; data: { initialPassword: string; createdAt: Date } }>(`/api/admin/users/${userId}/initial-password`);
    return response.data;
  },

  deleteUser: async (userId: string) => {
    const response = await apiRequest<{ success: boolean; message?: string }>(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
    return response;
  },
};

// Profile API functions
export const profileApi = {
  getProfile: async () => {
    const response = await apiRequest<{ success: boolean; data: any }>('/api/auth/profile');
    return response.data;
  },

  updateProfile: async (email: string) => {
    const response = await apiRequest<{ success: boolean; data: any; message?: string }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({ email }),
    });
    return response;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiRequest<{ success: boolean; message?: string }>('/api/auth/profile/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return response;
  },

  deleteAccount: async (password: string) => {
    const response = await apiRequest<{ success: boolean; message?: string }>('/api/auth/profile', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    return response;
  },
};

// Module API functions
export interface Module {
  id: string;
  title: string;
  description?: string | null;
  allowedCategories: string[];
  createdAt: string;
  updatedAt: string;
  lessons?: Lesson[];
  userProgress?: {
    completedLessons: number;
    totalLessons: number;
    progressPercentage: number;
  };
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string | null;
  order: number;
  status: 'UPLOADED' | 'PROCESSING' | 'READY';
  hlsMaster?: string | null;
  duration?: number | null;
  thumbnailUrl?: string | null;
  userProgress?: {
    completed: boolean;
    progress: number;
    lastWatchedAt?: string | null;
  };
}

export const moduleApi = {
  listModules: async () => {
    const response = await apiRequest<{ success: boolean; data: Module[] }>('/api/modules');
    return response.data;
  },

  getModule: async (id: string) => {
    const response = await apiRequest<{ success: boolean; data: Module }>(`/api/modules/${id}`);
    return response.data;
  },

  // Admin functions
  createModule: async (payload: { title: string; description?: string; allowedCategories?: string[] }) => {
    const response = await apiRequest<{ success: boolean; data: Module }>('/api/admin/modules', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  listAllModules: async () => {
    const response = await apiRequest<{ success: boolean; data: Module[] }>('/api/admin/modules');
    return response.data;
  },

  getModuleAdmin: async (id: string) => {
    const response = await apiRequest<{ success: boolean; data: Module }>(`/api/admin/modules/${id}`);
    return response.data;
  },

  updateModule: async (id: string, payload: { title?: string; description?: string | null; allowedCategories?: string[] }) => {
    const response = await apiRequest<{ success: boolean; data: Module }>(`/api/admin/modules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  deleteModule: async (id: string) => {
    const response = await apiRequest<{ success: boolean }>(`/api/admin/modules/${id}`, {
      method: 'DELETE',
    });
    return response;
  },
};

export const lessonApi = {
  getLesson: async (id: string) => {
    const response = await apiRequest<{ success: boolean; data: Lesson }>(`/api/lessons/${id}`);
    return response.data;
  },

  getStreamUrl: async (id: string) => {
    const response = await apiRequest<{ success: boolean; data: { hlsUrl: string; lessonId: string; title: string } }>(`/api/lessons/${id}/stream`);
    return response.data;
  },

  updateProgress: async (id: string, payload: { progress?: number; completed?: boolean }) => {
    const response = await apiRequest<{ success: boolean; data: any }>(`/api/lessons/${id}/progress`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  // Admin functions
  createLesson: async (moduleId: string, payload: { title: string; description?: string; order?: number }) => {
    const response = await apiRequest<{ success: boolean; data: Lesson }>(`/api/admin/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  uploadLessonVideo: async (lessonId: string, formData: FormData) => {
    const token = getAuthToken();
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const response = await fetch(`${API_URL}/api/admin/lessons/${lessonId}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Upload failed');
    }

    return response.json();
  },

  updateLesson: async (lessonId: string, payload: { title?: string; description?: string | null; order?: number }) => {
    const response = await apiRequest<{ success: boolean; data: Lesson }>(`/api/admin/lessons/${lessonId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  deleteLesson: async (lessonId: string) => {
    const response = await apiRequest<{ success: boolean }>(`/api/admin/lessons/${lessonId}`, {
      method: 'DELETE',
    });
    return response;
  },
};

