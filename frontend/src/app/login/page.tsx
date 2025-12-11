'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if redirected after password change
    if (searchParams.get('passwordChanged') === 'true') {
      setSuccess('Password changed successfully! Please log in with your new password.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.success && data.data?.token) {
        const tokenKey = process.env.NEXT_PUBLIC_JWT_STORAGE_KEY || 'vs_platform_token';
        localStorage.setItem(tokenKey, data.data.token);
        
        // Small delay to ensure token is stored before redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if password must be changed
        if (data.data.user?.passwordMustChange) {
          router.replace('/profile/change-password');
        } else {
          // Redirect directly to dashboard to avoid double redirect
          router.replace('/dashboard');
        }
      } else {
        throw new Error(data.error || 'Login failed - invalid response');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Cannot connect to server. Please ensure the backend is running on http://localhost:3001');
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout subtitle="Login with username">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Username Field */}
        <div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
              className="w-full pl-10 pr-4 py-3 border border-[#E5E7EB] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#0A1A3A] focus:border-transparent placeholder:text-[#A1A1A1]"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Password"
              className="w-full pl-10 pr-12 py-3 border border-[#E5E7EB] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#0A1A3A] focus:border-transparent placeholder:text-[#A1A1A1]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Forgot Password */}
        <div className="flex justify-end">
          <Link
            href="/auth/forgot-password"
            className="text-[12.5px] text-[#0A1A3A] opacity-60 hover:opacity-100 transition-opacity"
          >
            Forgot Password
          </Link>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#0A1A3A] text-white py-3 px-4 rounded-[10px] font-sans font-semibold hover:bg-[#0A1A3A]/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Logging in...
            </>
          ) : (
            'LOGIN'
          )}
        </button>

        {/* Registration is disabled - only admins can create accounts */}
      </form>
    </AuthLayout>
  );
}

