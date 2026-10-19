// Runs the named pnpm scripts in order while holding the browser-suite lock, so `pnpm quality` queues as one browser suite.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { z } from 'zod';
import { HELD_VARIABLE, lockBrowserSuite } from './browser-suite-lock.ts';

const environment = { ...process.env, [HELD_VARIABLE]: '1' };

// pnpm names its own executable here for the scripts it runs, so no PATH lookup picks another.
const pnpm = z
  .string({ error: 'Run this through `pnpm quality`.' })
  .parse(process.env.npm_execpath);

// Spawned, not run synchronously, so the lock keeps telling waiting suites who holds it.
async function runScript(script: string): Promise<number> {
  const child = spawn(pnpm, [script], { stdio: 'inherit', env: environment });
  const [code] = await once(child, 'exit');

  return typeof code === 'number' ? code : 1;
}

async function runInOrder(scripts: string[]): Promise<number> {
  for (const script of scripts) {
    const code = await runScript(script);

    if (code !== 0) return code;
  }

  return 0;
}

const release = await lockBrowserSuite();

const code = await runInOrder(process.argv.slice(2));

release?.();

process.exit(code);
