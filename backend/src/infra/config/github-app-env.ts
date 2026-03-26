import { z } from 'zod';

const optionalGitHubAppEnvSchema = z
  .object({
    GITHUB_APP_ID: z.string().trim().min(1).optional(),
    GITHUB_APP_INSTALLATION_ID: z.string().trim().min(1).optional(),
    GITHUB_APP_PRIVATE_KEY: z.string().trim().min(1).optional(),
    GITHUB_APP_WEBHOOK_SECRET: z.string().trim().min(1).optional(),
  })
  .transform((value) => {
    const hasValues = Object.values(value).some((field) => field !== undefined);

    if (!hasValues) {
      return null;
    }

    return value;
  });

const requiredGitHubAppEnvSchema = z.object({
  GITHUB_APP_ID: z.string().trim().min(1),
  GITHUB_APP_INSTALLATION_ID: z.string().trim().min(1),
  GITHUB_APP_PRIVATE_KEY: z.string().trim().min(1),
  GITHUB_APP_WEBHOOK_SECRET: z.string().trim().min(1),
});

export type GitHubAppEnv = z.infer<typeof requiredGitHubAppEnvSchema>;

export const loadOptionalGitHubAppEnv = (
  input: NodeJS.ProcessEnv,
): GitHubAppEnv | null => {
  const optionalConfig = optionalGitHubAppEnvSchema.parse(input);

  if (optionalConfig === null) {
    return null;
  }

  return requiredGitHubAppEnvSchema.parse(optionalConfig);
};

export const loadGitHubAppEnv = (input: NodeJS.ProcessEnv): GitHubAppEnv =>
  requiredGitHubAppEnvSchema.parse(input);

