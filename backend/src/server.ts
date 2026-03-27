import { createServer } from './app/create-server.js';
import { loadAppEnv } from './infra/config/app-env.js';
import { loadOptionalOperatorAuthEnv } from './infra/config/auth-env.js';
import { loadOptionalGitHubAppEnv } from './infra/config/github-app-env.js';

const start = async (): Promise<void> => {
  const env = loadAppEnv(process.env);
  const authConfig = loadOptionalOperatorAuthEnv(process.env);
  const githubConfig = loadOptionalGitHubAppEnv(process.env);
  const server = createServer({
    env,
    authConfig,
    githubConfig,
  });

  try {
    await server.listen({
      host: '0.0.0.0',
      port: env.PORT,
    });
  } catch (error) {
    server.log.error(error, 'Failed to start ForgeOps backend');
    process.exitCode = 1;
  }
};

void start();
