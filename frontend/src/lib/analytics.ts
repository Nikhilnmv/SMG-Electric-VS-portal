// Analytics event tracking module with batching and retry logic

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const BATCH_INTERVAL = 3000; // 3 seconds
const MAX_BATCH_SIZE = 50;
const MAX_RETRIES = 3;

export type EventType =
  | 'VIDEO_PLAY'
  | 'VIDEO_PAUSE'
  | 'VIDEO_PROGRESS'
  | 'VIDEO_COMPLETE'
  | 'VIDEO_BUFFER'
  | 'VIDEO_SEEK'
  | 'FOCUS_MODE_START'
  | 'FOCUS_MODE_END'
  | 'VIDEO_OPENED'
  | 'VIDEO_EXITED';

export interface AnalyticsEvent {
  videoId?: string | null;
  lessonId?: string | null;
  timestamp?: string;
  eventType: EventType;
  currentTime?: number;
  duration?: number;
  playbackQuality?: string;
  device?: string;
  categoryRole?: string;
  sessionId?: string;
}

class AnalyticsTracker {
  private eventQueue: AnalyticsEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private sessionId: string;
  private userId: string | null = null;
  private categoryRole: string | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadUserInfo();
  }

  private generateSessionId(): string {
    // Generate a proper UUID v4 format
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private loadUserInfo() {
    if (typeof window === 'undefined') return;
    
    try {
      const tokenKey = process.env.NEXT_PUBLIC_JWT_STORAGE_KEY || 'vs_platform_token';
      const token = localStorage.getItem(tokenKey);
      
      if (token) {
        // Decode JWT to get user info (simple base64 decode, not full validation)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          this.userId = payload.id || null;
        } catch (e) {
          console.warn('Failed to decode token for analytics');
        }
      }
    } catch (error) {
      console.warn('Failed to load user info for analytics:', error);
    }
  }

  private getDeviceInfo(): string {
    if (typeof window === 'undefined') return 'unknown';
    return navigator.userAgent || 'unknown';
  }

  private async sendBatch(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    const token = this.getAuthToken();
    if (!token) {
      console.warn('No auth token available, skipping analytics batch');
      return;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // Send events individually (ClickHouse handles batching on backend)
    const promises = events.map((event) =>
      this.sendEventWithRetry(event, headers)
    );

    await Promise.allSettled(promises);
  }

  private async sendEventWithRetry(
    event: AnalyticsEvent,
    headers: HeadersInit,
    retries = 0
  ): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/api/analytics/event`, {
        method: 'POST',
        headers,
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.details) {
            errorMessage += ` - ${JSON.stringify(errorData.details)}`;
          } else if (errorData.error) {
            errorMessage += ` - ${errorData.error}`;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.warn(`Analytics event send failed (attempt ${retries + 1}):`, error);
      console.warn('Event data:', JSON.stringify(event, null, 2));
      
      if (retries < MAX_RETRIES) {
        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, retries) * 1000)
        );
        return this.sendEventWithRetry(event, headers, retries + 1);
      } else {
        console.error('Failed to send analytics event after retries:', event);
        // Store failed events in localStorage for later retry
        this.storeFailedEvent(event);
      }
    }
  }

  private storeFailedEvent(event: AnalyticsEvent) {
    if (typeof window === 'undefined') return;
    
    try {
      const failedEvents = this.getFailedEvents();
      // Add retry count to event
      const eventWithRetry = { ...event, _retryCount: (event as any)._retryCount || 0 };
      failedEvents.push(eventWithRetry);
      // Keep only last 50 failed events to prevent storage bloat
      if (failedEvents.length > 50) {
        failedEvents.shift();
      }
      localStorage.setItem('analytics_failed_events', JSON.stringify(failedEvents));
    } catch (error) {
      console.error('Failed to store failed event:', error);
    }
  }

  private getFailedEvents(): AnalyticsEvent[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem('analytics_failed_events');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  private async retryFailedEvents() {
    const failedEvents = this.getFailedEvents();
    if (failedEvents.length === 0) return;

    const token = this.getAuthToken();
    if (!token) return;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const successful: number[] = [];
    const remaining: any[] = [];
    
    for (let i = 0; i < failedEvents.length; i++) {
      const event = failedEvents[i];
      const retryCount = (event as any)._retryCount || 0;
      
      // Don't retry events that have failed too many times (more than 5 retries)
      if (retryCount >= 5) {
        console.warn('Skipping event after too many retries:', event.eventType);
        continue;
      }
      
      try {
        // Increment retry count before sending
        const eventToSend = { ...event, _retryCount: retryCount + 1 };
        await this.sendEventWithRetry(eventToSend, headers, retryCount);
        successful.push(i);
      } catch (error) {
        // Keep in failed events with incremented retry count
        remaining.push({ ...event, _retryCount: retryCount + 1 });
      }
    }

    // Update failed events list
    if (typeof window !== 'undefined') {
      if (successful.length > 0 || remaining.length !== failedEvents.length) {
        localStorage.setItem('analytics_failed_events', JSON.stringify(remaining));
      }
    }
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    const tokenKey = process.env.NEXT_PUBLIC_JWT_STORAGE_KEY || 'vs_platform_token';
    return localStorage.getItem(tokenKey);
  }

  private scheduleBatch() {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.flush();
    }, BATCH_INTERVAL);
  }

  private flush() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.eventQueue.length === 0) return;

    const eventsToSend = this.eventQueue.splice(0, MAX_BATCH_SIZE);
    this.sendBatch(eventsToSend);
  }

  track(event: Omit<AnalyticsEvent, 'sessionId' | 'device'>) {
    if (!this.userId) {
      this.loadUserInfo();
      if (!this.userId) {
        console.warn('Cannot track event: user not authenticated');
        return;
      }
    }

    // Validate that at least one ID is present (required by backend)
    if (!event.videoId && !event.lessonId) {
      console.warn('Cannot track event: either videoId or lessonId is required', event);
      return;
    }

    // Don't send userId - backend gets it from JWT token
    const fullEvent: AnalyticsEvent = {
      ...event,
      sessionId: this.sessionId,
      device: this.getDeviceInfo(),
      timestamp: new Date().toISOString(),
    };

    this.eventQueue.push(fullEvent);

    // Flush immediately if batch is full
    if (this.eventQueue.length >= MAX_BATCH_SIZE) {
      this.flush();
    } else {
      this.scheduleBatch();
    }
  }

  // Public method to manually flush events
  async flushEvents() {
    this.flush();
  }

  // Initialize retry mechanism for failed events
  init() {
    // Retry failed events on initialization (with delay to avoid immediate retry spam)
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        this.retryFailedEvents();
      }, 2000); // Wait 2 seconds before retrying
    }
    
    // Retry failed events periodically (every 5 minutes)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.retryFailedEvents();
      }, 5 * 60 * 1000);
    }

    // Flush events before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
    }
  }
}

// Singleton instance
export const analytics = new AnalyticsTracker();

// Initialize on module load
if (typeof window !== 'undefined') {
  analytics.init();
}

