import { z } from 'zod';

const persistenceEnvSchema = z.object({
  DATABASE_URL: z.string().trim().url(),
  REDIS_URL: z.string().trim().url(),
});

export type PersistenceEnv = z.infer<typeof persistenceEnvSchema>;

export const loadPersistenceEnv = (input: NodeJS.ProcessEnv): PersistenceEnv =>
  persistenceEnvSchema.parse(input);

