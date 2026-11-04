import {
  counterRoot,
  counterTappedRoot,
} from '@repo/contracts/plugins/wire-fixtures';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { drawnRoot, pageAt } from '#mocks/plugin-pages';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it('draws the counter fixture as the wire fixtures describe, and the address a tap names with its count', async () => {
  const home = await createRuntimePlugins([
    { id: 'counter', fixture: 'wire-counter', main: 'index.js' },
  ]);

  const { caller } = await startEngineTestHost({ home });

  await expect(drawnRoot(caller, pageAt('counter', '/'))).resolves.toEqual(
    counterRoot,
  );
  await expect(
    drawnRoot(caller, pageAt('counter', '/', { taps: 1 })),
  ).resolves.toEqual(counterTappedRoot);
}, 20_000);

it('refuses className on a Plugin component with a local drawing failure', async () => {
  const home = await createRuntimePlugins([
    { id: 'styled', fixture: 'class-name' },
  ]);

  const { caller, createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const watching = createCaller({ signal: controller.signal });
  const failures = (await watching.plugins.failures())[Symbol.asyncIterator]();
  expect((await failures.next()).value).toEqual([]);

  await expect(
    caller.plugins.draw({ ...pageAt('styled', '/'), pages: 1 }),
  ).resolves.toEqual({
    kind: 'failed',
    error: 'Text: className is not allowed on Plugin components',
  });
  expect((await failures.next()).value).toMatchObject([
    {
      pluginId: 'styled',
      kind: 'drawing',
      message: 'Text: className is not allowed on Plugin components',
    },
  ]);
  expect(await caller.plugin.list()).toMatchObject({
    plugins: [{ state: 'running', error: null }],
  });
}, 20_000);
