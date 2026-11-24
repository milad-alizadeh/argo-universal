import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it, onTestFinished, vi } from 'vitest';
import { concurrentCommandLimit } from './plugin-host-slots';
import { PluginProcesses } from './plugin-processes';

// A command that notes it started, then waits for the `go` file before it ends.
const stalled = (folder: string, name: string): string[] => [
  process.execPath,
  '-e',
  `const fs = require('fs');
   fs.writeFileSync(${JSON.stringify(join(folder, `started-${name}`))}, '');
   const wait = () => fs.existsSync(${JSON.stringify(join(folder, 'go'))}) ? process.exit(0) : setTimeout(wait, 20);
   wait();`,
];

const startedIn = (folder: string): number =>
  readdirSync(folder).filter((file) => file.startsWith('started-')).length;

it('runs at most the cap of one Plugin’s commands at once, and the rest as those end', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'argo-commands-'));
  const processes = new PluginProcesses();

  onTestFinished(async () => {
    processes.release();
    await rm(folder, { recursive: true, force: true });
  });

  const total = concurrentCommandLimit + 4;

  const runs = Array.from({ length: total }, (_, n) =>
    processes.run({
      argv: stalled(folder, String(n)),
      cwd: folder,
      env: {},
    }),
  );

  await vi.waitFor(() =>
    expect(startedIn(folder)).toBe(concurrentCommandLimit),
  );
  // Give any command over the cap the time it would need to start.
  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });
  expect(startedIn(folder)).toBe(concurrentCommandLimit);

  writeFileSync(join(folder, 'go'), '');
  await Promise.all(runs);

  expect(startedIn(folder)).toBe(total);
  expect(existsSync(join(folder, 'go'))).toBe(true);
}, 30_000);
