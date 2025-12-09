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
  listVideosByCategory: async () => {
    const response = await apiRequest<{ success: boolean; data: any[] }>('/api/videos/category');
    return response.data;
  },
  myVideos: async () => {
    const response = await apiRequest<{ success: boolean; data: any[] }>('/api/videos/my-videos');
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
  trackEvent: async (videoId: string, eventType: string, progressSeconds?: number, deviceInfo?: string) => {
    const response = await apiRequest<{ success: boolean }>('/api/analytics/event', {
      method: 'POST',
      body: JSON.stringify({
        videoId,
        eventType,
        progressSeconds,
        deviceInfo,
      }),
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
export interface PendingVideo {
  id: string;
  title: string;
  userId: string;
  uploadDate: string;
  status: string;
  hlsPath: string | null;
  userEmail: string;
}

export interface AdminUser {
  id: string;
  email: string;
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
  getPendingVideos: async () => {
    const response = await apiRequest<{ success: boolean; data: PendingVideo[] }>('/api/admin/videos/pending');
    return response.data;
  },

  approveVideo: async (videoId: string) => {
    const response = await apiRequest<{ success: boolean; data: any; message?: string }>(`/api/admin/videos/${videoId}/approve`, {
      method: 'POST',
    });
    return response;
  },

  rejectVideo: async (videoId: string, deleteFromStorage = false) => {
    const response = await apiRequest<{ success: boolean; data: any; message?: string; warning?: string }>(`/api/admin/videos/${videoId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ deleteFromStorage }),
    });
    return response;
  },

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

