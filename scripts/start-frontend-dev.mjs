import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const isExecutedDirectly = () => {
  return process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;
};

export const normalizeProxyPort = (value) => {
  const port = typeof value === 'string' ? value.trim() : '';

  if (port.length === 0) {
    return '80';
  }

  if (!/^\d+$/.test(port)) {
    throw new Error('FORGEOPS_PROXY_PORT must be a numeric port.');
  }

  return port;
};

export const resolveLocalApiBaseUrl = ({
  explicitBaseUrl,
  proxyPort,
  host = 'api.forgeops.local',
  protocol = 'http',
} = {}) => {
  const overriddenBaseUrl =
    typeof explicitBaseUrl === 'string' ? explicitBaseUrl.trim() : '';

  if (overriddenBaseUrl.length > 0) {
    return overriddenBaseUrl;
  }

  const effectivePort = normalizeProxyPort(proxyPort);
  const origin = `${protocol}://${host}`;

  return effectivePort === '80' ? origin : `${origin}:${effectivePort}`;
};

export const createFrontendDevEnv = (env = process.env) => {
  const nextEnv = {
    ...env,
    NEXT_PUBLIC_API_BASE_URL: resolveLocalApiBaseUrl({
      explicitBaseUrl: env.NEXT_PUBLIC_API_BASE_URL,
      proxyPort: env.FORGEOPS_PROXY_PORT,
    }),
  };

  return nextEnv;
};

export const startFrontendDev = (env = process.env) => {
  const nextEnv = createFrontendDevEnv(env);
  const runBinPath = fileURLToPath(new URL('./run-bin.mjs', import.meta.url));
  const frontendDir = fileURLToPath(new URL('../frontend', import.meta.url));

  process.env.NEXT_PUBLIC_API_BASE_URL = nextEnv.NEXT_PUBLIC_API_BASE_URL;
  process.stdout.write(
    `[forgeops] NEXT_PUBLIC_API_BASE_URL=${nextEnv.NEXT_PUBLIC_API_BASE_URL}\n`,
  );

  const child = spawn(
    process.execPath,
    [runBinPath, 'next', 'dev', '--hostname', '0.0.0.0', '--port', '3000'],
    {
      cwd: frontendDir,
      env: nextEnv,
      stdio: 'inherit',
    },
  );

  child.on('error', (error) => {
    process.stderr.write(`[forgeops] failed to start frontend dev server: ${error.message}\n`);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
};

if (isExecutedDirectly()) {
  startFrontendDev();
}
