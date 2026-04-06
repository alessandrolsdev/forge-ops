import { pathToFileURL } from 'node:url';
import { createServer } from './app/create-server.js';
import { createOperatorAuthVerifier } from './infra/auth/create-operator-auth-verifier.js';
import { loadAppEnv } from './infra/config/app-env.js';
import { loadOptionalOperatorAuthEnv } from './infra/config/auth-env.js';
import { loadOptionalGitHubAppEnv } from './infra/config/github-app-env.js';

export const resolveRuntimeServerOptions = (input: NodeJS.ProcessEnv) => {
  const env = loadAppEnv(input);
  const authConfig = loadOptionalOperatorAuthEnv(input);
  const githubConfig = loadOptionalGitHubAppEnv(input);

  return {
    env,
    authConfig,
    authVerifier: authConfig ? createOperatorAuthVerifier(authConfig) : null,
    githubConfig,
  };
};

const start = async (): Promise<void> => {
  const runtimeOptions = resolveRuntimeServerOptions(process.env);
  const server = createServer(runtimeOptions);

  try {
    await server.listen({
      host: '0.0.0.0',
      port: runtimeOptions.env.PORT,
    });
  } catch (error) {
    server.log.error(error, 'Failed to start ForgeOps backend');
    process.exitCode = 1;
  }
};

const isDirectExecution = (): boolean => {
  const entrypointPath = process.argv[1];

  if (!entrypointPath) {
    return false;
  }

  return import.meta.url === pathToFileURL(entrypointPath).href;
};

if (isDirectExecution()) {
  void start();
}
