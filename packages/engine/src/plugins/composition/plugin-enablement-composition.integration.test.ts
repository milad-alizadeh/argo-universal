import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { probeEntry, settingsProbe } from '#mocks/plugin-settings';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

it('lists a first-party Plugin as on until the user turns it off', async () => {
  const home = await createRuntimePlugins([settingsProbe]);
  const { caller } = await startEngineTestHost({ home });

  expect(await probeEntry(caller)).toMatchObject({ enabled: true });
  await caller.plugin.setEnabled({ pluginId: 'probe', enabled: false });
  expect(await probeEntry(caller)).toMatchObject({ enabled: false });
});

it('keeps a Plugin off across Engine restarts', async () => {
  const home = await createRuntimePlugins([settingsProbe]);
  const first = await startEngineTestHost({ home });

  await first.caller.plugin.setEnabled({ pluginId: 'probe', enabled: false });
  await first.stop();

  const { caller } = await startEngineTestHost({ home });

  expect(await probeEntry(caller)).toMatchObject({ enabled: false });
});

it('stops a running Plugin when it is turned off and refuses to start it', async () => {
  const home = await createRuntimePlugins([settingsProbe]);
  const { caller } = await startEngineTestHost({ home });

  await caller.plugin.activate({ pluginId: 'probe' });
  await caller.plugin.setEnabled({ pluginId: 'probe', enabled: false });

  expect(await probeEntry(caller)).toMatchObject({
    enabled: false,
    state: 'not-started',
  });
  await expect(caller.plugin.activate({ pluginId: 'probe' })).rejects.toThrow(
    'Plugin probe is turned off',
  );
});

it('starts a Plugin again once it is turned back on', async () => {
  const home = await createRuntimePlugins([settingsProbe]);
  const { caller } = await startEngineTestHost({ home });

  await caller.plugin.activate({ pluginId: 'probe' });
  await caller.plugin.setEnabled({ pluginId: 'probe', enabled: false });
  await caller.plugin.setEnabled({ pluginId: 'probe', enabled: true });

  expect(await caller.plugin.activate({ pluginId: 'probe' })).toMatchObject({
    state: 'running',
  });
});

it('ends the live pages of a Plugin when it is turned off', async () => {
  const home = await createRuntimePlugins([
    { id: 'surface', fixture: 'surface' },
  ]);

  const { caller, createCaller } = await startEngineTestHost({
    home,
  });

  const watching = createCaller({ signal: new AbortController().signal });

  const live = await watching.plugins.live({
    pluginId: 'surface',
    path: '/live',
    pageState: {},
  });

  const answers = live[Symbol.asyncIterator]();

  await answers.next();
  await caller.plugin.setEnabled({ pluginId: 'surface', enabled: false });

  await expect(answers.next()).resolves.toMatchObject({
    value: { kind: 'failed', error: 'Plugin stopped' },
  });
  await expect(answers.next()).resolves.toMatchObject({ done: true });
  // A Plugin turned off is not failing to draw.
  const failures = (await watching.plugins.failures())[Symbol.asyncIterator]();
  await expect(failures.next()).resolves.toMatchObject({ value: [] });
}, 20_000);

it('tells a watching App that a Plugin was turned off', async () => {
  const home = await createRuntimePlugins([settingsProbe]);
  const { caller, createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  const watching = createCaller({ signal: controller.signal });

  const changes = (await watching.plugins.listChanges())[
    Symbol.asyncIterator
  ]();

  const change = changes.next();
  await caller.plugin.setEnabled({ pluginId: 'probe', enabled: false });

  expect((await change).value).toEqual({ pluginId: 'probe' });
  controller.abort();
  expect(await changes.next()).toMatchObject({ done: true });
}, 20_000);

it('tells a watching App that a Plugin was turned back on', async () => {
  const home = await createRuntimePlugins([settingsProbe]);
  const { caller, createCaller } = await startEngineTestHost({ home });
  await caller.plugin.setEnabled({ pluginId: 'probe', enabled: false });

  const changes = (
    await createCaller({
      signal: new AbortController().signal,
    }).plugins.listChanges()
  )[Symbol.asyncIterator]();

  const change = changes.next();
  await caller.plugin.setEnabled({ pluginId: 'probe', enabled: true });

  expect((await change).value).toEqual({ pluginId: 'probe' });
}, 20_000);
