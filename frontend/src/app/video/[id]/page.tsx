'use client';

import MainLayout from '@/components/layout/MainLayout';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This page redirects to /watch/[id] for the actual playback
export default function VideoPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/watch/${params.id}`);
  }, [params.id, router]);

  return (
    <MainLayout>
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B214A]"></div>
      </div>
    </MainLayout>
  );
}

