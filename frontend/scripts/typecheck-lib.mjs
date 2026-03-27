import { access } from 'node:fs/promises';
import path from 'node:path';

export const getNextTypegenReadyFiles = (projectRoot) => [
  path.join(projectRoot, '.next', 'types', 'routes.d.ts'),
  path.join(projectRoot, '.next', 'types', 'validator.ts'),
];

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForFiles = async (
  files,
  {
    timeoutMs = 5_000,
    intervalMs = 100,
    accessFn = access,
    sleep = defaultSleep,
  } = {},
) => {
  const timeoutAt = Date.now() + timeoutMs;

  while (Date.now() < timeoutAt) {
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          await accessFn(file);
          return true;
        } catch {
          return false;
        }
      }),
    );

    if (results.every(Boolean)) {
      return;
    }

    await sleep(intervalMs);
  }

  throw new Error('Next type generation artifacts were not ready in time.');
};
