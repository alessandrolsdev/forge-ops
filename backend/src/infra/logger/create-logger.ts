import pino, { type LevelWithSilent } from 'pino';

export const createLogger = (level: LevelWithSilent) =>
  pino({
    level,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'githubConfig.GITHUB_APP_PRIVATE_KEY',
        'githubConfig.GITHUB_APP_WEBHOOK_SECRET',
        '*.privateKey',
        '*.webhookSecret',
      ],
      remove: true,
    },
  });

