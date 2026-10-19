#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

const main = fileURLToPath(new URL('../src/main.ts', import.meta.url));

const child = spawn(
  process.execPath,
  [
    '--experimental-vm-modules',
    '--import',
    require.resolve('tsx'),
    main,
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit' },
);

for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal));

child.once('error', (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});

child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
