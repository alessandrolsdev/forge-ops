import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = process.platform === 'win32'
      ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/c', command, ...args], { stdio: 'inherit' })
      : spawn(command, args, { stdio: 'inherit' });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`${command} exited with code ${code ?? 'unknown'}`));
    });
  });

const localBin = (name) =>
  path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForFiles = async (files) => {
  const timeoutAt = Date.now() + 5_000;

  while (Date.now() < timeoutAt) {
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          await access(file);
          return true;
        } catch {
          return false;
        }
      }),
    );

    if (results.every(Boolean)) {
      return;
    }

    await wait(100);
  }

  throw new Error('Next route types were not generated in time.');
};

const expectedTypeFiles = [
  path.join(process.cwd(), '.next', 'types', 'app', 'layout.ts'),
  path.join(process.cwd(), '.next', 'types', 'app', 'page.ts'),
  path.join(process.cwd(), '.next', 'types', 'app', 'repositories', 'page.ts'),
  path.join(process.cwd(), '.next', 'types', 'app', 'settings', 'page.ts'),
  path.join(process.cwd(), '.next', 'types', 'cache-life.d.ts'),
];

const main = async () => {
  await run(localBin('next'), ['typegen']);
  await waitForFiles(expectedTypeFiles);
  await run(localBin('tsc'), ['--project', 'tsconfig.json', '--noEmit']);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
