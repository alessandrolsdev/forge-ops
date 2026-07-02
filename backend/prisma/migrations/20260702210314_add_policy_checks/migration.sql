-- CreateEnum
CREATE TYPE "PolicyKey" AS ENUM ('ci_workflow_present', 'lint_workflow_present', 'test_workflow_present', 'automated_review_present', 'reusable_workflow_present', 'security_workflow_present');

-- CreateEnum
CREATE TYPE "PolicyCheckStatus" AS ENUM ('compliant', 'non_compliant');

-- CreateTable
CREATE TABLE "PolicyCheck" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "policyKey" "PolicyKey" NOT NULL,
    "status" "PolicyCheckStatus" NOT NULL,
    "details" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyCheck_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PolicyCheck_repositoryId_checkedAt_idx" ON "PolicyCheck"("repositoryId", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyCheck_repositoryId_policyKey_key" ON "PolicyCheck"("repositoryId", "policyKey");

-- AddForeignKey
ALTER TABLE "PolicyCheck" ADD CONSTRAINT "PolicyCheck_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
