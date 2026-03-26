import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const [bin, ...args] = process.argv.slice(2);

if (!bin) {
  console.error('A local binary name is required.');
  process.exit(1);
}

const executable = process.platform === 'win32' ? `${bin}.CMD` : bin;
const command = path.join(process.cwd(), 'node_modules', '.bin', executable);
const child = process.platform === 'win32'
  ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/c', command, ...args], { stdio: 'inherit' })
  : spawn(command, args, { stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
