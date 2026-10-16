import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { openReadOnlyDatabase } from '@repo/db/plugin-database';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { MemoryKeychain } from '#mocks/memory-keychain';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const notesIn = (home: string, pluginId: string): unknown[] => {
  const database = openReadOnlyDatabase(
    join(home, 'plugin-data', pluginId, 'plugin.db'),
  );

  try {
    return database.prepare('select body from notes').all();
  } finally {
    database.close();
  }
};

it('creates Plugin storage lazily, keeps it across Engine restarts and round-trips secrets through the Keychain', async () => {
  const home = await createRuntimePlugins([
    { id: 'idle', fixture: 'healthy' },
    { id: 'storing', fixture: 'storage' },
  ]);

  const keychain = new MemoryKeychain();
  const first = await startEngineTestHost({ home, keychain });
  await first.caller.plugins.activate({ pluginId: 'idle' });

  expect(existsSync(join(home, 'plugin-data'))).toBe(false);
  expect(
    await first.caller.plugins.activate({ pluginId: 'storing' }),
  ).toMatchObject({ state: 'running', error: null });
  expect(existsSync(join(home, 'plugin-data/idle'))).toBe(false);
  expect(notesIn(home, 'storing')).toHaveLength(1);
  expect([...keychain.entries]).toEqual([
    ['argo.plugin.storing\u0000token', 'plugin-secret'],
  ]);

  await first.stop();
  const second = await startEngineTestHost({ home, keychain });
  await second.caller.plugins.activate({ pluginId: 'storing' });

  expect(notesIn(home, 'storing')).toHaveLength(2);
});

it('keeps Argo own database free of Plugin tables', async () => {
  const home = await createRuntimePlugins([
    { id: 'storing', fixture: 'storage' },
  ]);

  const { caller } = await startEngineTestHost({
    home,
    keychain: new MemoryKeychain(),
  });

  await caller.plugins.activate({ pluginId: 'storing' });

  const argo = openReadOnlyDatabase(join(home, 'argo.db'));
  onTestFinished(() => argo.close());

  expect(
    argo
      .prepare("select name from sqlite_master where name like '%notes%'")
      .all(),
  ).toEqual([]);
});
