import { JWTPayload, UserRole } from '@vs-platform/types';

/**
 * Decode JWT token without verification (client-side only)
 * For production, tokens should be verified on the backend
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded) as JWTPayload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Get current user from localStorage token
 */
export function getCurrentUser(): JWTPayload | null {
  if (typeof window === 'undefined') return null;

  const tokenKey = process.env.NEXT_PUBLIC_JWT_STORAGE_KEY || 'vs_platform_token';
  const token = localStorage.getItem(tokenKey);

  if (!token) return null;

  return decodeJWT(token);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

/**
 * Check if user has admin role
 */
export function isAdmin(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return user.role?.toUpperCase() === 'ADMIN';
}

/**
 * Check if user has editor role or higher
 */
export function isEditorOrAdmin(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  const role = user.role?.toUpperCase();
  return role === 'ADMIN' || role === 'EDITOR';
}

/**
 * Get user role
 */
export function getUserRole(): UserRole | null {
  const user = getCurrentUser();
  return user?.role?.toUpperCase() as UserRole | null;
}

/**
 * Get user categoryRole
 */
export function getUserCategoryRole(): string | null {
  const user = getCurrentUser();
  return user?.categoryRole || null;
}

/**
 * Logout user (clear token)
 */
export function logout(): void {
  if (typeof window === 'undefined') return;

  const tokenKey = process.env.NEXT_PUBLIC_JWT_STORAGE_KEY || 'vs_platform_token';
  localStorage.removeItem(tokenKey);
}

