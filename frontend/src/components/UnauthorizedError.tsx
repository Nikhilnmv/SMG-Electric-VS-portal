'use client';

import React from 'react';
import Link from 'next/link';

interface Props {
  message?: string;
}

/**
 * Unauthorized access error component
 */
export function UnauthorizedError({ message = 'You do not have permission to access this resource.' }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 text-center mb-2">
          Access Denied
        </h2>
        <p className="text-gray-600 text-center mb-4">
          {message}
        </p>
        <div className="space-y-2">
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded text-center hover:bg-blue-700 transition"
          >
            Go to Home
          </Link>
          <Link
            href="/login"
            className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded text-center hover:bg-gray-300 transition"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}

