import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it, vi } from 'vitest';
import { processWait } from '#mocks/data-fixture';
import { startEngineTestHost } from '#mocks/engine';
import { journeyMs } from '#mocks/journey-budget';
import { killPluginHost, pluginHostPids } from '#mocks/plugin-host-log';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

// Plugin workers start a real process: budget this file's tests for startup.
vi.setConfig({ testTimeout: journeyMs });

it('restarts the real Plugin host three times, logs the running Plugins and then reports budget exhaustion', async () => {
  const home = await createRuntimePlugins([
    { id: 'healthy', fixture: 'healthy' },
  ]);

  const { caller } = await startEngineTestHost({ home });
  await caller.plugins.activate({ pluginId: 'healthy' });

  for (const restart of [1, 2, 3]) {
    await killPluginHost(home);
    await expect
      .poll(() => pluginHostPids(home), processWait)
      .toHaveLength(restart + 1);
    expect(
      await caller.plugins.activate({ pluginId: 'healthy' }),
    ).toMatchObject({ state: 'running' });
  }

  await killPluginHost(home);
  await expect
    .poll(() => caller.plugins.list())
    .toMatchObject({
      errors: [
        { message: 'Plugin host restart budget exhausted (3 in 5 minutes)' },
      ],
    });
  expect(await caller.plugins.activate({ pluginId: 'healthy' })).toMatchObject({
    state: 'crashed',
    error: 'Plugin host restart budget exhausted (3 in 5 minutes)',
  });
  expect(await pluginHostPids(home)).toHaveLength(4);
  expect(await readFile(join(home, 'logs/plugins.log'), 'utf8')).toContain(
    'running Plugins: healthy',
  );
}, 30_000);

it('closes the host and its workers when the composed Engine stops, without consuming a restart', async () => {
  const home = await createRuntimePlugins([
    { id: 'healthy', fixture: 'healthy' },
  ]);

  const host = await startEngineTestHost({ home });
  await host.caller.plugins.activate({ pluginId: 'healthy' });
  const [pid] = await pluginHostPids(home);

  expect(pid).toBeGreaterThan(0);
  await host.stop();
  expect(() => process.kill(pid ?? 0, 0)).toThrow('kill ESRCH');
  expect(await pluginHostPids(home)).toHaveLength(1);
});

// `pnpm dev` runs the Engine under `node --watch`, which makes every descendant report its imports over IPC as `watch:*` messages.
it('runs a Plugin under a watching Engine, whose watch reports never reach the Plugin protocol', async () => {
  vi.stubEnv('WATCH_REPORT_DEPENDENCIES', '1');
  const home = await createRuntimePlugins([
    { id: 'healthy', fixture: 'healthy' },
  ]);

  const { caller } = await startEngineTestHost({ home });

  expect(await caller.plugins.activate({ pluginId: 'healthy' })).toMatchObject({
    state: 'running',
  });
  expect(await readFile(join(home, 'logs/plugins.log'), 'utf8')).not.toContain(
    'invalid message',
  );
});
