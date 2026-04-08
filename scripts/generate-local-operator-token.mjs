import { createHmac } from 'node:crypto';

const DEFAULT_TTL_SECONDS = 3600;

const encodeBase64Url = (value) =>
  Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');

const parseArgs = (argv) => {
  const options = {
    subject: 'operator:local-smoke',
    capabilities: [],
    ttlSeconds: DEFAULT_TTL_SECONDS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--subject') {
      const subject = argv[index + 1];

      if (!subject) {
        throw new Error('Missing value for --subject.');
      }

      options.subject = subject;
      index += 1;
      continue;
    }

    if (argument === '--capability') {
      const capability = argv[index + 1];

      if (!capability) {
        throw new Error('Missing value for --capability.');
      }

      options.capabilities.push(capability);
      index += 1;
      continue;
    }

    if (argument === '--ttl-seconds') {
      const ttlSeconds = Number(argv[index + 1]);

      if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
        throw new Error('Invalid value for --ttl-seconds.');
      }

      options.ttlSeconds = ttlSeconds;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  return options;
};

const dedupeCapabilities = (capabilities) =>
  Array.from(
    new Set(
      capabilities
        .map((capability) => capability.trim())
        .filter((capability) => capability.length > 0),
    ),
  );

export const createLocalOperatorToken = ({
  issuer,
  audience,
  sharedSecret,
  subject,
  capabilities,
  now = new Date(),
  ttlSeconds = DEFAULT_TTL_SECONDS,
}) => {
  if (!issuer) {
    throw new Error('OPERATOR_AUTH_ISSUER is required.');
  }

  if (!audience) {
    throw new Error('OPERATOR_AUTH_AUDIENCE is required.');
  }

  if (!sharedSecret) {
    throw new Error('OPERATOR_AUTH_SHARED_SECRET is required.');
  }

  if (!subject) {
    throw new Error('Token subject is required.');
  }

  const normalizedCapabilities = dedupeCapabilities(capabilities);
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = encodeBase64Url({
    alg: 'HS256',
    typ: 'JWT',
  });
  const payload = encodeBase64Url({
    sub: subject,
    iss: issuer,
    aud: audience,
    iat: issuedAt,
    nbf: issuedAt - 5,
    exp: issuedAt + ttlSeconds,
    capabilities: normalizedCapabilities,
  });
  const signingInput = `${header}.${payload}`;
  const signature = createHmac('sha256', sharedSecret)
    .update(signingInput)
    .digest('base64url');

  return `${signingInput}.${signature}`;
};

const printUsage = () => {
  console.error(
    [
      'Usage: node scripts/generate-local-operator-token.mjs [options]',
      '',
      'Options:',
      '  --subject <value>           Override token subject',
      '  --capability <value>        Add a capability (repeatable)',
      '  --ttl-seconds <value>       Override token lifetime in seconds',
      '',
      'Default capabilities:',
      '  repositories:read',
      '  repositories:write',
    ].join('\n'),
  );
};

const main = () => {
  const mode = process.env.OPERATOR_AUTH_MODE;

  if (mode !== 'shared-secret') {
    throw new Error(
      'Local token generation requires OPERATOR_AUTH_MODE=shared-secret.',
    );
  }

  const options = parseArgs(process.argv.slice(2));
  const capabilities =
    options.capabilities.length > 0
      ? options.capabilities
      : ['repositories:read', 'repositories:write'];

  const token = createLocalOperatorToken({
    issuer: process.env.OPERATOR_AUTH_ISSUER ?? '',
    audience: process.env.OPERATOR_AUTH_AUDIENCE ?? '',
    sharedSecret: process.env.OPERATOR_AUTH_SHARED_SECRET ?? '',
    subject: options.subject,
    capabilities,
    ttlSeconds: options.ttlSeconds,
  });

  process.stdout.write(`${token}\n`);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error) {
    printUsage();
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

export { parseArgs };
