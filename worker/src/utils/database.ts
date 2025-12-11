import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/vs_platform?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

export async function updateVideoStatus(
  videoId: string,
  status: 'PROCESSING' | 'READY' | 'UPLOADED',
  hlsPath?: string
) {
  // Check current video status before updating
  const currentVideo = await prisma.video.findUnique({
    where: { id: videoId },
    select: { status: true },
  });

  console.log(`[Database] Updating video ${videoId}: status=${status}, hlsPath=${hlsPath || 'N/A'}, currentStatus=${currentVideo?.status}`);

  // If video is already APPROVED, keep it APPROVED when transcoding completes
  // Only update to READY if it's not already APPROVED
  const finalStatus = currentVideo?.status === 'APPROVED' && status === 'READY' 
    ? 'APPROVED' 
    : status;

  const updateData: any = {
    status: finalStatus,
  };

  if (hlsPath) {
    updateData.hlsPath = hlsPath;
  }

  const updated = await prisma.video.update({
    where: { id: videoId },
    data: updateData,
  });

  console.log(`[Database] Video updated: id=${updated.id}, status=${updated.status}, hlsPath=${updated.hlsPath || 'N/A'}`);

  return updated;
}

export async function getVideoCategoryRole(videoId: string): Promise<string | null> {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { categoryRole: true },
  });
  return video?.categoryRole || null;
}

export async function updateLessonStatus(
  lessonId: string,
  status: 'PROCESSING' | 'READY' | 'UPLOADED',
  hlsMaster?: string
) {
  console.log(`[Database] Updating lesson ${lessonId}: status=${status}, hlsMaster=${hlsMaster || 'N/A'}`);

  const updateData: any = {
    status,
  };

  if (hlsMaster) {
    updateData.hlsMaster = hlsMaster;
  }

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
    data: updateData,
  });

  console.log(`[Database] Lesson updated: id=${updated.id}, status=${updated.status}, hlsMaster=${updated.hlsMaster || 'N/A'}`);

  return updated;
}

export { prisma };
