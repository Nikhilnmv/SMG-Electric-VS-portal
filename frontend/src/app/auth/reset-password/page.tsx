'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const usernameParam = searchParams.get('username');

    if (tokenParam) {
      setToken(decodeURIComponent(tokenParam));
    } else {
      setError('Reset token is missing. Please use the link from your email.');
    }

    if (usernameParam) {
      setUsername(decodeURIComponent(usernameParam));
    }
  }, [searchParams]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    // Validate passwords
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setValidationErrors({ newPassword: passwordError });
      return;
    }

    if (newPassword !== confirmPassword) {
      setValidationErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    if (!username || !token) {
      setError('Username and token are required');
      return;
    }

    setIsLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, token, newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        throw new Error(data.error || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout subtitle="Password Reset Successful">
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>Your password has been reset successfully!</span>
          </div>

          <div className="text-sm text-gray-600">
            You will be redirected to the login page in a few seconds...
          </div>

          <Link
            href="/login"
            className="w-full bg-[#0A1A3A] text-white py-3 px-4 rounded-[10px] font-sans font-semibold hover:bg-[#0A1A3A]/90 transition-colors flex items-center justify-center"
          >
            Go to Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (!token) {
    return (
      <AuthLayout subtitle="Invalid Reset Link">
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>Reset token is missing. Please use the link from your email.</span>
          </div>

          <Link
            href="/auth/forgot-password"
            className="w-full bg-[#0A1A3A] text-white py-3 px-4 rounded-[10px] font-sans font-semibold hover:bg-[#0A1A3A]/90 transition-colors flex items-center justify-center"
          >
            Request New Reset Link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout subtitle="Reset Your Password">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Username Field (if not in URL) */}
        {!username && (
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter your username"
              className="w-full px-4 py-3 border border-[#E5E7EB] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#0A1A3A] focus:border-transparent placeholder:text-[#A1A1A1]"
            />
          </div>
        )}

        {/* New Password Field */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
            New Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setValidationErrors({ ...validationErrors, newPassword: '' });
              }}
              required
              placeholder="Enter new password"
              className={`w-full pl-10 pr-12 py-3 border rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#0A1A3A] focus:border-transparent placeholder:text-[#A1A1A1] ${
                validationErrors.newPassword ? 'border-red-300' : 'border-[#E5E7EB]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {validationErrors.newPassword && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.newPassword}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Must be at least 8 characters with uppercase, lowercase, and a number
          </p>
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setValidationErrors({ ...validationErrors, confirmPassword: '' });
              }}
              required
              placeholder="Confirm new password"
              className={`w-full pl-10 pr-12 py-3 border rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#0A1A3A] focus:border-transparent placeholder:text-[#A1A1A1] ${
                validationErrors.confirmPassword ? 'border-red-300' : 'border-[#E5E7EB]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {validationErrors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#0A1A3A] text-white py-3 px-4 rounded-[10px] font-sans font-semibold hover:bg-[#0A1A3A]/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Resetting Password...
            </>
          ) : (
            'Reset Password'
          )}
        </button>

        {/* Back to Login */}
        <div className="text-center">
          <Link
            href="/login"
            className="text-[12.5px] text-[#0A1A3A] opacity-60 hover:opacity-100 transition-opacity"
          >
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

