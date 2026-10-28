import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { processWait } from '#mocks/data-fixture';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it.each(['index.mjs', 'index.cjs'])(
  'lists unstarted Plugins, lazily loads a %s entry once and reloads it on change',
  async (main) => {
    const home = await createRuntimePlugins([
      { id: 'healthy', fixture: 'healthy', main },
    ]);

    const { caller } = await startEngineTestHost({ home });

    expect((await caller.plugin.list()).plugins).toMatchObject([
      {
        manifest: { id: 'healthy' },
        state: 'not-started',
        hanging: false,
        error: null,
      },
    ]);
    expect(
      await Promise.all([
        caller.plugin.activate({ pluginId: 'healthy' }),
        caller.plugin.activate({ pluginId: 'healthy' }),
      ]),
    ).toEqual([
      { state: 'running', hanging: false, error: null },
      { state: 'running', hanging: false, error: null },
    ]);
    // First-party Plugins are watched, so the broken entry is reloaded and reported.
    await writeFile(
      join(home, 'shipped/healthy', main),
      'throw Error("Changed entry")',
    );
    await expect
      .poll(() => caller.plugin.list(), processWait)
      .toMatchObject({
        plugins: [{ state: 'crashed', error: 'Changed entry' }],
      });
    expect(await caller.plugin.activate({ pluginId: 'healthy' })).toMatchObject(
      { state: 'crashed', error: 'Changed entry' },
    );
  },
  20_000,
);

it.each([
  { fixture: 'crashing', error: 'Fixture Plugin crashed' },
  { fixture: 'node-global', error: 'process is not defined' },
  // First-party Plugins are bundled on load, so a Node import fails at bundling.
  { fixture: 'require-fs', error: 'Could not resolve "fs"' },
  { fixture: 'heap', error: 'memory limit' },
])(
  'isolates a $fixture Plugin from healthy workers and the Engine',
  async ({ fixture, error }) => {
    const home = await createRuntimePlugins([
      { id: 'healthy', fixture: 'healthy' },
      { id: 'bad', fixture },
    ]);

    const { caller } = await startEngineTestHost({ home });
    await caller.plugin.activate({ pluginId: 'healthy' });

    expect(await caller.plugin.activate({ pluginId: 'bad' })).toMatchObject({
      state: 'crashed',
      hanging: false,
      error: expect.stringContaining(error),
    });
    expect((await caller.plugin.list()).plugins).toMatchObject([
      { manifest: { id: 'bad' }, state: 'crashed' },
      { manifest: { id: 'healthy' }, state: 'running', error: null },
    ]);
    expect(await caller.plugin.activate({ pluginId: 'healthy' })).toMatchObject(
      { state: 'running' },
    );
    expect(await readFile(join(home, 'logs/plugins.log'), 'utf8')).toContain(
      error,
    );
  },
);

it.each(['hanging', 'pending'])(
  'flags and terminates a %s Plugin after the real three-second deadline',
  async (fixture) => {
    const home = await createRuntimePlugins([{ id: 'bad', fixture }]);
    const { caller } = await startEngineTestHost({ home });
    const started = Date.now();

    expect(await caller.plugin.activate({ pluginId: 'bad' })).toEqual({
      state: 'crashed',
      hanging: true,
      error: 'Plugin did not answer within 3 seconds',
    });
    expect(Date.now() - started).toBeGreaterThanOrEqual(3000);
    expect((await caller.plugin.list()).plugins).toMatchObject([
      { state: 'crashed', hanging: true },
    ]);
  },
  15_000,
);

it('refuses an unknown Plugin without starting arbitrary code', async () => {
  const home = await createRuntimePlugins([]);
  const { caller } = await startEngineTestHost({ home });

  await expect(caller.plugin.activate({ pluginId: 'missing' })).rejects.toThrow(
    'Unknown Plugin: missing',
  );
  expect(await caller.plugin.list()).toEqual({ plugins: [], errors: [] });
});
