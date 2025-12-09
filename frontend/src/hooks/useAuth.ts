'use client';

import { useState, useEffect } from 'react';
import { getCurrentUser, isAuthenticated, isAdmin, getUserRole, getUserCategoryRole } from '@/lib/auth';
import { JWTPayload, UserRole } from '@vs-platform/types';

interface AuthState {
  user: JWTPayload | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  role: UserRole | null;
  categoryRole: string | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isAdmin: false,
    role: null,
    categoryRole: null,
    loading: true,
  });

  useEffect(() => {
    const updateAuth = () => {
      if (typeof window === 'undefined') {
        setAuthState({
          user: null,
          isAuthenticated: false,
          isAdmin: false,
          role: null,
          categoryRole: null,
          loading: false,
        });
        return;
      }

      const user = getCurrentUser();
      const authenticated = isAuthenticated();
      const admin = isAdmin();
      const role = getUserRole();
      const categoryRole = getUserCategoryRole();

      setAuthState({
        user,
        isAuthenticated: authenticated,
        isAdmin: admin,
        role,
        categoryRole,
        loading: false,
      });
    };

    updateAuth();

    // Only set up listeners if we're in the browser
    if (typeof window === 'undefined') {
      return;
    }

    // Listen for storage changes (logout/login from other tabs)
    const handleStorageChange = () => {
      updateAuth();
    };

    window.addEventListener('storage', handleStorageChange);

    // Poll for changes (in case token is updated in same tab)
    const interval = setInterval(updateAuth, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return authState;
}

