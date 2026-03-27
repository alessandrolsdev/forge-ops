import { z } from 'zod';

export const repositoryConnectionSchema = z.object({
  owner: z.string().trim().min(2, 'Owner must have at least 2 characters.'),
  repository: z
    .string()
    .trim()
    .min(2, 'Repository name must have at least 2 characters.')
    .regex(
      /^[a-z0-9._-]+$/,
      'Repository name must use lowercase letters, numbers, dots, underscores, or dashes.',
    ),
  installationId: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? '')
    .refine((value) => value === '' || /^\d+$/.test(value), 'Installation ID must be numeric.')
    .transform((value) => (value === '' ? undefined : value)),
});

export type RepositoryConnectionValues = z.infer<typeof repositoryConnectionSchema>;
