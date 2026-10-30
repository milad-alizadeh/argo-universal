import { existsSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { openReadOnlyDatabase } from '@repo/db/plugin-database';
import { expect, it, onTestFinished, vi } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { GatedKeychain } from '#mocks/gated-keychain';
import { journeyMs } from '#mocks/journey-budget';
import { MemoryKeychain } from '#mocks/memory-keychain';
import { pluginHostPids } from '#mocks/plugin-host-log';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

// Plugin workers start a real process: budget this file's tests for startup.
vi.setConfig({ testTimeout: journeyMs });

// Starting a dev Plugin bundles it first, which is slow on a busy machine.
const pollOptions = { timeout: 30_000 };

const storageId = 'storage-plugin';

const storagePlugin = { id: storageId, fixture: 'storage' };

const notesIn = (home: string, pluginId: string): unknown[] => {
  const database = openReadOnlyDatabase(
    join(home, 'plugin-data', pluginId, 'plugin.db'),
  );

  try {
    return database.prepare('select body from notes order by rowid').all();
  } finally {
    database.close();
  }
};

it('creates a Plugin file only when the Plugin first uses storage', async () => {
  const home = await createRuntimePlugins([
    { id: 'idle', fixture: 'healthy' },
    storagePlugin,
  ]);

  const { caller } = await startEngineTestHost({
    home,
    keychain: new MemoryKeychain(),
  });

  await caller.plugin.activate({ pluginId: 'idle' });

  expect(existsSync(join(home, 'plugin-data'))).toBe(false);
  expect(await caller.plugin.activate({ pluginId: storageId })).toMatchObject({
    state: 'running',
    error: null,
  });
  expect(existsSync(join(home, `plugin-data/${storageId}/plugin.db`))).toBe(
    true,
  );
  expect(existsSync(join(home, 'plugin-data/idle'))).toBe(false);
});

it('keeps Plugin storage across Engine restarts', async () => {
  const home = await createRuntimePlugins([storagePlugin]);

  const first = await startEngineTestHost({
    home,
    keychain: new MemoryKeychain(),
  });

  await first.caller.plugin.activate({ pluginId: storageId });
  await first.stop();

  const second = await startEngineTestHost({
    home,
    keychain: new MemoryKeychain(),
  });

  await second.caller.plugin.activate({ pluginId: storageId });

  expect(notesIn(home, storageId)).toEqual([
    { body: 'hello' },
    { body: 'rejected' },
    { body: 'hello' },
    { body: 'rejected' },
  ]);
});

it('stores secrets in the Keychain keyed by Plugin and account, and deletes them', async () => {
  const home = await createRuntimePlugins([storagePlugin]);
  const keychain = new MemoryKeychain();
  const { caller } = await startEngineTestHost({ home, keychain });

  await caller.plugin.activate({ pluginId: storageId });

  expect(await keychain.get(`argo.plugin.${storageId}`, 'token')).toBe(
    'plugin-secret',
  );
  expect(await keychain.get(`argo.plugin.${storageId}`, 'temp')).toBeNull();
});

it('keeps Argo own database unchanged when a Plugin stores data', async () => {
  const home = await createRuntimePlugins([storagePlugin]);

  const { caller } = await startEngineTestHost({
    home,
    keychain: new MemoryKeychain(),
  });

  const argo = openReadOnlyDatabase(join(home, 'argo.db'));
  onTestFinished(() => argo.close());

  const schema = (): unknown[] =>
    argo.prepare('select name, sql from sqlite_master order by name').all();

  const before = schema();

  await caller.plugin.activate({ pluginId: storageId });

  expect(schema()).toEqual(before);
});

it('answers a malformed storage call with an error for that Plugin only, leaving the plugin host and other Plugins running', async () => {
  const home = await createRuntimePlugins([
    { id: 'healthy', fixture: 'healthy' },
    { id: 'bad', fixture: 'bad-call' },
  ]);

  const { caller } = await startEngineTestHost({
    home,
    keychain: new MemoryKeychain(),
  });

  await caller.plugin.activate({ pluginId: 'healthy' });

  expect(await caller.plugin.activate({ pluginId: 'bad' })).toMatchObject({
    state: 'crashed',
  });
  expect(await caller.plugin.activate({ pluginId: 'healthy' })).toMatchObject({
    state: 'running',
  });
  expect(await pluginHostPids(home)).toHaveLength(1);
});

it('keeps argo, its results and its errors free of any way out of the Plugin context', async () => {
  const home = await createRuntimePlugins([
    { id: 'contained', fixture: 'escape' },
  ]);

  const { caller } = await startEngineTestHost({
    home,
    keychain: new MemoryKeychain(),
  });

  expect(await caller.plugin.activate({ pluginId: 'contained' })).toMatchObject(
    { state: 'running', error: null },
  );
});

it('drops a reply that belongs to a reloaded Plugin worker', async () => {
  const home = await createRuntimePlugins([
    { id: 'echo', fixture: 'secret-echo', dev: true },
  ]);

  const keychain = new GatedKeychain();
  const { caller } = await startEngineTestHost({ home, keychain });
  void caller.plugin.activate({ pluginId: 'echo' });
  await expect.poll(() => keychain.waiting.length, pollOptions).toBe(1);

  await appendFile(join(home, 'shipped/echo/index.mjs'), '\n// reload\n');
  await expect.poll(() => keychain.waiting.length, pollOptions).toBe(2);

  keychain.waiting[0]?.('stale');
  keychain.waiting[1]?.('fresh');

  await expect
    .poll(
      async () => (await caller.plugin.list()).plugins[0]?.error,
      pollOptions,
    )
    .toBe('got fresh');
});
