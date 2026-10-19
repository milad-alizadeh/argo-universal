#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const tsx = createRequire(import.meta.url).resolve('tsx');

const main = fileURLToPath(new URL('../cli/main.ts', import.meta.url));

// The kit ships TypeScript, and Plugin tests need VM modules, which Node enables only at startup.
const { status, error } = spawnSync(
  process.execPath,
  [
    '--experimental-vm-modules',
    '--import',
    tsx,
    main,
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit' },
);

if (error) process.stderr.write(`${error.message}\n`);

process.exitCode = status ?? 1;
