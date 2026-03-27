import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { getNextTypegenReadyFiles, waitForFiles } from './typecheck-lib.mjs';

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

const main = async () => {
  await run(localBin('next'), ['typegen']);
  await waitForFiles(getNextTypegenReadyFiles(process.cwd()));
  await run(localBin('tsc'), ['--project', 'tsconfig.json', '--noEmit']);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
