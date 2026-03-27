import { z } from 'zod';

const operatorAuthModeSchema = z.enum(['jwks', 'shared-secret']);

const rawOperatorAuthEnvSchema = z.object({
  OPERATOR_AUTH_ENABLED: z.enum(['true', 'false']).optional(),
  OPERATOR_AUTH_ISSUER: z.string().trim().min(1).optional(),
  OPERATOR_AUTH_AUDIENCE: z.string().trim().min(1).optional(),
  OPERATOR_AUTH_MODE: operatorAuthModeSchema.optional(),
  OPERATOR_AUTH_JWKS_URL: z.string().trim().url().optional(),
  OPERATOR_AUTH_SHARED_SECRET: z.string().trim().min(1).optional(),
});

const enabledOperatorAuthEnvSchema = z
  .object({
    OPERATOR_AUTH_ENABLED: z.literal('true'),
    OPERATOR_AUTH_ISSUER: z.string().trim().min(1),
    OPERATOR_AUTH_AUDIENCE: z.string().trim().min(1),
    OPERATOR_AUTH_MODE: operatorAuthModeSchema,
    OPERATOR_AUTH_JWKS_URL: z.string().trim().url().optional(),
    OPERATOR_AUTH_SHARED_SECRET: z.string().trim().min(1).optional(),
  })
  .superRefine((value, context) => {
    if (value.OPERATOR_AUTH_MODE === 'jwks') {
      if (!value.OPERATOR_AUTH_JWKS_URL) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'OPERATOR_AUTH_JWKS_URL is required when OPERATOR_AUTH_MODE=jwks.',
          path: ['OPERATOR_AUTH_JWKS_URL'],
        });
      }

      if (value.OPERATOR_AUTH_SHARED_SECRET) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'OPERATOR_AUTH_SHARED_SECRET must not be set when OPERATOR_AUTH_MODE=jwks.',
          path: ['OPERATOR_AUTH_SHARED_SECRET'],
        });
      }
    }

    if (value.OPERATOR_AUTH_MODE === 'shared-secret') {
      if (!value.OPERATOR_AUTH_SHARED_SECRET) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'OPERATOR_AUTH_SHARED_SECRET is required when OPERATOR_AUTH_MODE=shared-secret.',
          path: ['OPERATOR_AUTH_SHARED_SECRET'],
        });
      }

      if (value.OPERATOR_AUTH_JWKS_URL) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'OPERATOR_AUTH_JWKS_URL must not be set when OPERATOR_AUTH_MODE=shared-secret.',
          path: ['OPERATOR_AUTH_JWKS_URL'],
        });
      }
    }
  });

export interface OperatorAuthEnv {
  issuer: string;
  audience: string;
  verifierSource:
    | {
        type: 'jwks';
        jwksUrl: string;
      }
    | {
        type: 'shared-secret';
        sharedSecret: string;
      };
}

const hasAdditionalConfig = (
  input: z.infer<typeof rawOperatorAuthEnvSchema>,
): boolean => {
  return [
    input.OPERATOR_AUTH_ISSUER,
    input.OPERATOR_AUTH_AUDIENCE,
    input.OPERATOR_AUTH_MODE,
    input.OPERATOR_AUTH_JWKS_URL,
    input.OPERATOR_AUTH_SHARED_SECRET,
  ].some((field) => typeof field !== 'undefined');
};

const toOperatorAuthEnv = (
  input: z.infer<typeof enabledOperatorAuthEnvSchema>,
): OperatorAuthEnv => {
  if (input.OPERATOR_AUTH_MODE === 'jwks') {
    return {
      issuer: input.OPERATOR_AUTH_ISSUER,
      audience: input.OPERATOR_AUTH_AUDIENCE,
      verifierSource: {
        type: 'jwks',
        jwksUrl: input.OPERATOR_AUTH_JWKS_URL!,
      },
    };
  }

  return {
    issuer: input.OPERATOR_AUTH_ISSUER,
    audience: input.OPERATOR_AUTH_AUDIENCE,
    verifierSource: {
      type: 'shared-secret',
      sharedSecret: input.OPERATOR_AUTH_SHARED_SECRET!,
    },
  };
};

export const loadOptionalOperatorAuthEnv = (
  input: NodeJS.ProcessEnv,
): OperatorAuthEnv | null => {
  const rawConfig = rawOperatorAuthEnvSchema.parse(input);

  if (rawConfig.OPERATOR_AUTH_ENABLED !== 'true') {
    if (hasAdditionalConfig(rawConfig)) {
      throw new Error(
        'Operator auth config requires OPERATOR_AUTH_ENABLED=true when auth fields are provided.',
      );
    }

    return null;
  }

  return toOperatorAuthEnv(enabledOperatorAuthEnvSchema.parse(rawConfig));
};

export const loadOperatorAuthEnv = (input: NodeJS.ProcessEnv): OperatorAuthEnv => {
  const rawConfig = rawOperatorAuthEnvSchema.parse(input);

  if (rawConfig.OPERATOR_AUTH_ENABLED !== 'true') {
    throw new Error('OPERATOR_AUTH_ENABLED=true is required for protected operator auth.');
  }

  return toOperatorAuthEnv(enabledOperatorAuthEnvSchema.parse(rawConfig));
};
