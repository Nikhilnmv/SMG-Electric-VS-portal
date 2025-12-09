-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" TEXT,
ADD COLUMN IF NOT EXISTS "passwordMustChange" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "passwordResetTokenHash" TEXT,
ADD COLUMN IF NOT EXISTS "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "createdByAdminId" TEXT,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "lastPasswordChangeAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username") WHERE "username" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

