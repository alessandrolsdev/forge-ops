-- CreateEnum
CREATE TYPE "CodexReviewSummarySource" AS ENUM ('github_review', 'workflow_comment');

-- CreateTable
CREATE TABLE "CodexReviewSummary" (
    "id" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "source" "CodexReviewSummarySource" NOT NULL,
    "summary" TEXT NOT NULL,
    "blockersCount" INTEGER NOT NULL,
    "suggestionsCount" INTEGER NOT NULL,
    "risksCount" INTEGER NOT NULL,
    "rawContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodexReviewSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodexReviewSummary_pullRequestId_key" ON "CodexReviewSummary"("pullRequestId");

-- CreateIndex
CREATE INDEX "CodexReviewSummary_pullRequestId_createdAt_idx" ON "CodexReviewSummary"("pullRequestId", "createdAt");

-- AddForeignKey
ALTER TABLE "CodexReviewSummary" ADD CONSTRAINT "CodexReviewSummary_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
