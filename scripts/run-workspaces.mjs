import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const task = process.argv[2];
const extraArgs = process.argv.slice(3);
const workspaces = ['packages/core', 'backend', 'frontend'];

if (!task) {
  console.error('A task name is required.');
  process.exit(1);
}

const spawnWorkspace = (workspace, commandTask, mode) => {
  const args = ['--prefix', workspace, 'run', commandTask, ...extraArgs];

  if (process.platform === 'win32') {
    return mode === 'sync'
      ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/c', npmCommand, ...args], { stdio: 'inherit' })
      : spawn(process.env.ComSpec ?? 'cmd.exe', ['/c', npmCommand, ...args], { stdio: 'inherit' });
  }

  return mode === 'sync'
    ? spawnSync(npmCommand, args, { stdio: 'inherit' })
    : spawn(npmCommand, args, { stdio: 'inherit' });
};

if (task === 'dev') {
  const children = workspaces.map((workspace) => spawnWorkspace(workspace, task, 'async'));

  const shutdown = (signal) => {
    for (const child of children) {
      child.kill(signal);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  let exitedChildren = 0;
  let hasFailed = false;

  for (const child of children) {
    child.on('exit', (code) => {
      exitedChildren += 1;
      if ((code ?? 0) !== 0) {
        hasFailed = true;
      }

      if (exitedChildren === children.length) {
        process.exit(hasFailed ? 1 : 0);
      }
    });
  }
} else {
  for (const workspace of workspaces) {
    const result = spawnWorkspace(workspace, task, 'sync');

    if ((result.status ?? 1) !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}
