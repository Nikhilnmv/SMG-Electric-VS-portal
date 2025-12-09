'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Registration page redirect
 * Public registration is disabled - only admins can create users
 */
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page
    router.replace('/login');
  }, [router]);

  return null; // Will redirect
}

