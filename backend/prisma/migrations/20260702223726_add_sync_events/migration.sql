-- CreateEnum
CREATE TYPE "SyncEventType" AS ENUM ('repository_connected', 'workflow_catalog_sync', 'workflow_runs_sync', 'pull_requests_sync', 'codex_review_sync', 'policy_evaluation');

-- CreateEnum
CREATE TYPE "SyncEventStatus" AS ENUM ('succeeded', 'failed');

-- CreateTable
CREATE TABLE "SyncEvent" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "type" "SyncEventType" NOT NULL,
    "status" "SyncEventStatus" NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncEvent_repositoryId_createdAt_idx" ON "SyncEvent"("repositoryId", "createdAt");

-- AddForeignKey
ALTER TABLE "SyncEvent" ADD CONSTRAINT "SyncEvent_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
