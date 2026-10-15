import { mkdir, mkdtemp, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrationsFolder, openDatabase } from '@repo/db';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished } from 'vitest';
import { readRegistryCache } from './registry-cache';

it('Migration A seeds present catalog entries and leaves saved Agent rows empty', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-registry-migration-'));
  const previous = join(directory, 'previous');
  await mkdir(previous);

  for (const entry of await readdir(migrationsFolder)) {
    if (entry.includes('registry_cache')) continue;
    await symlink(join(migrationsFolder, entry), join(previous, entry), 'dir');
  }

  const path = join(directory, 'argo.db');
  const old = openDatabase(path, previous);
  onTestFinished(async () => {
    if (old.$client.isOpen) old.$client.close();
    await rm(directory, { recursive: true, force: true });
  });
  const entry = publishedRegistry.agents[0];
  old.$client
    .prepare(
      'INSERT INTO agents (id, registry_metadata, catalog_present) VALUES (?, ?, ?)',
    )
    .run('present', JSON.stringify(entry), 1);
  old.$client
    .prepare(
      'INSERT INTO agents (id, registry_metadata, catalog_present) VALUES (?, ?, ?)',
    )
    .run('absent', JSON.stringify(publishedRegistry.agents[1]), 0);
  old.$client.close();
  const migrated = openDatabase(path);
  onTestFinished(() => migrated.$client.close());
  expect(readRegistryCache(migrated)).toEqual({
    version: '1.0.0',
    agents: [entry],
    extensions: [],
  });
  expect(migrated.$client.prepare('SELECT * FROM agent_servers').all()).toEqual(
    [],
  );
  expect(
    migrated.$client.prepare('SELECT fetched_at FROM registry_cache').get(),
  ).toEqual({ fetched_at: 0 });
  expect(() =>
    migrated.$client.exec('INSERT INTO registry_cache (id) VALUES (2)'),
  ).toThrow('CHECK constraint failed');
});
