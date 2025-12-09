-- CreateEnum
CREATE TYPE "CategoryRole" AS ENUM ('DEALER', 'EMPLOYEE', 'TECHNICIAN', 'STAKEHOLDER', 'INTERN', 'VENDOR');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "categoryRole" "CategoryRole" NOT NULL DEFAULT 'INTERN';
ALTER TABLE "users" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "videos" ADD COLUMN "categoryRole" "CategoryRole" NOT NULL DEFAULT 'INTERN';

-- Update existing videos to set categoryRole from their user's categoryRole
UPDATE "videos" v
SET "categoryRole" = u."categoryRole"
FROM "users" u
WHERE v."userId" = u."id";

