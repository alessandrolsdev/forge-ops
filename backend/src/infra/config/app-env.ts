import { z } from 'zod';

const appEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type AppEnv = z.infer<typeof appEnvSchema>;

export const loadAppEnv = (input: NodeJS.ProcessEnv): AppEnv => appEnvSchema.parse(input);

