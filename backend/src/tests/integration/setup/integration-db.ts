import { PrismaClient } from '@prisma/client';

export const createIntegrationPrismaClient = (): PrismaClient => {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is required to run integration tests. Start the local postgres (docker compose up -d postgres) and export DATABASE_URL before running pnpm --prefix backend run test:integration.',
    );
  }

  return new PrismaClient();
};

export const resetDatabase = async (prisma: PrismaClient): Promise<void> => {
  await prisma.codexReviewSummary.deleteMany();
  await prisma.pullRequest.deleteMany();
  await prisma.workflowJob.deleteMany();
  await prisma.workflowRun.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.repository.deleteMany();
};
