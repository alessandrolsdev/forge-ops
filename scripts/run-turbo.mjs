import { spawn } from 'node:child_process';
import process from 'node:process';

const command = process.platform === 'win32' ? 'node_modules\\.bin\\turbo.CMD' : './node_modules/.bin/turbo';
const args = ['run', ...process.argv.slice(2)];

const child = spawn(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
