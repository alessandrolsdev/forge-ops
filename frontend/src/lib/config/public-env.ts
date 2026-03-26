import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
});

export const getApiBaseUrl = (): string => {
  const env = publicEnvSchema.parse({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });

  return env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';
};

