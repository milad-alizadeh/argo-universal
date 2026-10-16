import { mkdir, mkdtemp, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrationsFolder, openDatabase, type Database } from '@repo/db';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished } from 'vitest';
import { readRegistryCache } from './registry-cache';

type CatalogRow = {
  id: string;
  metadata: string | null;
  present: number;
};

// A migrations folder holding every migration before Migration A.
const previousMigrations = async (directory: string): Promise<string> => {
  const previous = join(directory, 'previous');
  await mkdir(previous);

  for (const entry of await readdir(migrationsFolder)) {
    if (entry >= '20261015224114_registry_cache') continue;
    await symlink(join(migrationsFolder, entry), join(previous, entry), 'dir');
  }

  return previous;
};

// Opens a database migrated up to the step before Migration A, inserts catalog rows, then runs Migration A.
const migrateCatalog = async (rows: CatalogRow[]): Promise<Database> => {
  const directory = await mkdtemp(join(tmpdir(), 'argo-registry-migration-'));
  const previous = await previousMigrations(directory);
  const path = join(directory, 'argo.db');
  const old = openDatabase(path, previous);
  onTestFinished(async () => {
    if (old.$client.isOpen) old.$client.close();
    await rm(directory, { recursive: true, force: true });
  });

  const insert = old.$client.prepare(
    'INSERT INTO agents (id, registry_metadata, catalog_present) VALUES (?, ?, ?)',
  );

  for (const row of rows) insert.run(row.id, row.metadata, row.present);
  old.$client.close();
  const migrated = openDatabase(path);
  onTestFinished(() => migrated.$client.close());

  return migrated;
};

it('Migration A seeds present catalog entries and leaves saved Agent rows empty', async () => {
  const entry = publishedRegistry.agents[0];

  const migrated = await migrateCatalog([
    { id: 'present', metadata: JSON.stringify(entry), present: 1 },
    {
      id: 'absent',
      metadata: JSON.stringify(publishedRegistry.agents[1]),
      present: 0,
    },
  ]);

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

it.each([
  { catalog: 'no catalog rows', rows: [] },
  {
    catalog: 'only absent catalog rows',
    rows: [
      {
        id: 'absent',
        metadata: JSON.stringify(publishedRegistry.agents[1]),
        present: 0,
      },
    ],
  },
  {
    catalog: 'a present catalog row without Registry metadata',
    rows: [{ id: 'present', metadata: null, present: 1 }],
  },
])('Migration A stores no Registry row from $catalog', async ({ rows }) => {
  const migrated = await migrateCatalog(rows);
  expect(
    migrated.$client.prepare('SELECT * FROM registry_cache').all(),
  ).toEqual([]);
});
