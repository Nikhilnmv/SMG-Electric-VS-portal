'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface FocusModeState {
  sessionStartTime: Date | null;
  sessionDuration: number; // in seconds
  interruptions: number;
  isActive: boolean;
}

export function useFocusMode() {
  const [state, setState] = useState<FocusModeState>({
    sessionStartTime: null,
    sessionDuration: 0,
    interruptions: 0,
    isActive: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const startSession = useCallback(() => {
    const now = new Date();
    startTimeRef.current = now;
    setState({
      sessionStartTime: now,
      sessionDuration: 0,
      interruptions: 0,
      isActive: true,
    });

    // Update duration every second
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
        setState((prev) => ({
          ...prev,
          sessionDuration: duration,
        }));
      }
    }, 1000);
  }, []);

  const endSession = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isActive: false,
    }));
  }, []);

  const recordInterruption = useCallback(() => {
    setState((prev) => ({
      ...prev,
      interruptions: prev.interruptions + 1,
    }));
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...state,
    startSession,
    endSession,
    recordInterruption,
    formatDuration,
  };
}

