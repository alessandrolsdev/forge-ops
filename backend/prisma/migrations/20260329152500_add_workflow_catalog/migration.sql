-- CreateEnum
CREATE TYPE "WorkflowState" AS ENUM (
  'active',
  'deleted',
  'disabled_fork',
  'disabled_inactivity',
  'disabled_manually'
);

-- CreateEnum
CREATE TYPE "WorkflowSourceType" AS ENUM ('local', 'reusable');

-- CreateTable
CREATE TABLE "Workflow" (
  "id" TEXT NOT NULL,
  "repositoryId" TEXT NOT NULL,
  "githubWorkflowId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "state" "WorkflowState" NOT NULL,
  "sourceType" "WorkflowSourceType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workflow_repositoryId_githubWorkflowId_key"
ON "Workflow"("repositoryId", "githubWorkflowId");

-- CreateIndex
CREATE INDEX "Workflow_repositoryId_createdAt_idx"
ON "Workflow"("repositoryId", "createdAt");

-- AddForeignKey
ALTER TABLE "Workflow"
ADD CONSTRAINT "Workflow_repositoryId_fkey"
FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
