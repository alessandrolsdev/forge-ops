export interface CreateOperatorPrincipalInput {
  subject: string;
  email?: string | null;
  displayName?: string | null;
  capabilities?: string[];
}

export interface OperatorPrincipal {
  kind: 'operator';
  subject: string;
  email: string | null;
  displayName: string | null;
  capabilities: string[];
}

const normalizeOptionalText = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
};

export const createOperatorPrincipal = (
  input: CreateOperatorPrincipalInput,
): OperatorPrincipal => {
  const subject = input.subject.trim();

  if (subject.length === 0) {
    throw new Error('Operator principal subject must not be empty.');
  }

  const capabilities = Array.from(
    new Set(
      (input.capabilities ?? [])
        .map((capability) => capability.trim())
        .filter((capability) => capability.length > 0),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return {
    kind: 'operator',
    subject,
    email: normalizeOptionalText(input.email)?.toLowerCase() ?? null,
    displayName: normalizeOptionalText(input.displayName),
    capabilities,
  };
};
