import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const child = spawn(
  process.execPath,
  [
    '-e',
    "process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000)",
  ],
  { stdio: ['ignore', 'pipe', 'ignore'] },
);

process.on('SIGTERM', () => {});

child.stdout.once('data', () => {
  void writeFile('ready', `${process.pid},${child.pid}`);
});

setInterval(() => {}, 1000);
