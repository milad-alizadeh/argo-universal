import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { startPluginRuntime } from '#mocks/plugin-runtime-host';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it('exhausts failed OS launches and closes without waiting for an exit from a process that never spawned', async () => {
  const home = await createRuntimePlugins([]);
  const original = process.execPath;
  process.execPath = join(home, 'missing-node');
  onTestFinished(() => {
    process.execPath = original;
  });

  const runtime = startPluginRuntime(home);

  await expect
    .poll(() => runtime.error())
    .toBe('Plugin host restart budget exhausted (3 in 5 minutes)');
  process.execPath = original;
  await runtime.close();

  const log = await readFile(join(home, 'logs/plugins.log'), 'utf8');

  expect(log.match(/Plugin host error:/g)).toHaveLength(4);
  expect(runtime.error()).toBe(
    'Plugin host restart budget exhausted (3 in 5 minutes)',
  );
}, 10_000);
