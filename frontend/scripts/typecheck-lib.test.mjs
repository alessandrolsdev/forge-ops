import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { getNextTypegenReadyFiles, waitForFiles } from './typecheck-lib.mjs';

describe('typecheck-lib', () => {
  it('should wait for the core Next typegen artifacts instead of route-specific files', () => {
    const projectRoot = path.join('workspace', 'frontend');

    expect(getNextTypegenReadyFiles(projectRoot)).toEqual([
      path.join(projectRoot, '.next', 'types', 'routes.d.ts'),
      path.join(projectRoot, '.next', 'types', 'validator.ts'),
    ]);
  });

  it('should resolve once all required files become available', async () => {
    const files = ['routes.d.ts', 'validator.ts'];
    const attempts = new Map(files.map((file) => [file, 0]));
    const accessFn = vi.fn(async (file) => {
      const currentAttempts = attempts.get(file) ?? 0;
      attempts.set(file, currentAttempts + 1);

      if (file === 'validator.ts' && currentAttempts < 1) {
        throw new Error('Not ready yet');
      }
    });

    await expect(
      waitForFiles(files, {
        timeoutMs: 50,
        intervalMs: 1,
        accessFn,
        sleep: async () => undefined,
      }),
    ).resolves.toBeUndefined();

    expect(accessFn).toHaveBeenCalled();
  });

  it('should fail when the required files never become available', async () => {
    const accessFn = vi.fn(async () => {
      throw new Error('Missing');
    });

    await expect(
      waitForFiles(['routes.d.ts'], {
        timeoutMs: 5,
        intervalMs: 1,
        accessFn,
        sleep: async () => undefined,
      }),
    ).rejects.toThrow('Next type generation artifacts were not ready in time.');
  });
});
