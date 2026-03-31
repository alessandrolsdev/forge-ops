-- CreateEnum
CREATE TYPE "WorkflowExecutionStatus" AS ENUM (
  'queued',
  'in_progress',
  'completed',
  'pending',
  'waiting',
  'requested'
);

-- CreateEnum
CREATE TYPE "WorkflowExecutionConclusion" AS ENUM (
  'success',
  'failure',
  'neutral',
  'cancelled',
  'skipped',
  'timed_out',
  'action_required',
  'stale',
  'startup_failure'
);

-- CreateTable
CREATE TABLE "WorkflowRun" (
  "id" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "githubRunId" TEXT NOT NULL,
  "status" "WorkflowExecutionStatus" NOT NULL,
  "conclusion" "WorkflowExecutionConclusion",
  "branch" TEXT NOT NULL,
  "sha" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkflowRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowJob" (
  "id" TEXT NOT NULL,
  "workflowRunId" TEXT NOT NULL,
  "githubJobId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "WorkflowExecutionStatus" NOT NULL,
  "conclusion" "WorkflowExecutionConclusion",
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WorkflowJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowRun_workflowId_githubRunId_key"
ON "WorkflowRun"("workflowId", "githubRunId");

-- CreateIndex
CREATE INDEX "WorkflowRun_workflowId_startedAt_idx"
ON "WorkflowRun"("workflowId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowJob_workflowRunId_githubJobId_key"
ON "WorkflowJob"("workflowRunId", "githubJobId");

-- CreateIndex
CREATE INDEX "WorkflowJob_workflowRunId_startedAt_idx"
ON "WorkflowJob"("workflowRunId", "startedAt");

-- AddForeignKey
ALTER TABLE "WorkflowRun"
ADD CONSTRAINT "WorkflowRun_workflowId_fkey"
FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowJob"
ADD CONSTRAINT "WorkflowJob_workflowRunId_fkey"
FOREIGN KEY ("workflowRunId") REFERENCES "WorkflowRun"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
