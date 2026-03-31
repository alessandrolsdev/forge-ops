-- CreateEnum
CREATE TYPE "PullRequestState" AS ENUM ('open', 'closed', 'merged');

-- CreateTable
CREATE TABLE "PullRequest" (
  "id" TEXT NOT NULL,
  "repositoryId" TEXT NOT NULL,
  "githubPrId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "state" "PullRequestState" NOT NULL,
  "author" TEXT NOT NULL,
  "baseBranch" TEXT NOT NULL,
  "headBranch" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_repositoryId_githubPrId_key"
ON "PullRequest"("repositoryId", "githubPrId");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_repositoryId_number_key"
ON "PullRequest"("repositoryId", "number");

-- CreateIndex
CREATE INDEX "PullRequest_repositoryId_createdAt_idx"
ON "PullRequest"("repositoryId", "createdAt");

-- AddForeignKey
ALTER TABLE "PullRequest"
ADD CONSTRAINT "PullRequest_repositoryId_fkey"
FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
