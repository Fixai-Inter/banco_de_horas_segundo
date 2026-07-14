import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;

function run(label, args) {
  const child = spawn(node, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    if (code && code !== 0) {
      process.exitCode = code;
      shutdown();
    }
  });

  return child;
}

const server = run('server', [
  join(root, 'node_modules/tsx/dist/cli.mjs'),
  'server/index.ts',
]);

const client = run('client', [
  join(root, 'node_modules/vite/bin/vite.js'),
]);

function shutdown() {
  server.kill();
  client.kill();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
