'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, ArrowLeft, CheckCircle } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        throw new Error(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout subtitle="Password Reset Requested">
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            <span>If an account matching the provided username exists, we have sent a password reset email.</span>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            <p>Please check your email inbox for instructions on how to reset your password.</p>
            <p className="text-xs text-gray-500">
              The reset link will expire in 1 hour. If you don't see the email, check your spam folder.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full bg-[#0A1A3A] text-white py-3 px-4 rounded-[10px] font-sans font-semibold hover:bg-[#0A1A3A]/90 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
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
        <div className="text-sm text-gray-600 mb-4">
          Enter your username and we'll send you a link to reset your password.
        </div>

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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#0A1A3A] text-white py-3 px-4 rounded-[10px] font-sans font-semibold hover:bg-[#0A1A3A]/90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Sending...
            </>
          ) : (
            'Send Reset Link'
          )}
        </button>

        {/* Back to Login */}
        <div className="text-center">
          <Link
            href="/login"
            className="text-[12.5px] text-[#0A1A3A] opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

