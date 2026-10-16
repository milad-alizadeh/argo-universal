import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase } from '@repo/db';
import { eq } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { drizzle, type SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy';
import { migrate } from 'drizzle-orm/sqlite-proxy/migrator';
import { expect, it, onTestFinished } from 'vitest';
import { PluginStorage } from './storage';

const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
});

const pluginId = 'tasks-plugin';

const runMethod = 'run';

const taskTitle = 'write plugin';

async function startStorage(): Promise<{
  home: string;
  storage: PluginStorage;
}> {
  const home = await mkdtemp(join(tmpdir(), 'argo-plugin-storage-'));
  const storage = new PluginStorage(home);

  onTestFinished(async () => {
    storage.close();
    await rm(home, { recursive: true, force: true });
  });

  return { home, storage };
}

// Drizzle's sqlite-proxy driver is how a Plugin reaches its own file through `argo.storage`.
const proxyFor = (storage: PluginStorage, id: string): SqliteRemoteDatabase =>
  drizzle(async (sql, params, method) => {
    const [result] = storage.execute(id, [{ sql, params, method }]);

    return result ?? { rows: [] };
  });

it('runs a Plugin Drizzle schema, migrations and queries on its own file', async () => {
  const { home, storage } = await startStorage();
  const migrations = join(home, 'migrations');
  await mkdir(join(migrations, '20261016000000_init'), { recursive: true });
  await writeFile(
    join(migrations, '20261016000000_init/migration.sql'),
    'CREATE TABLE `tasks` (`id` integer PRIMARY KEY NOT NULL, `title` text NOT NULL);',
  );

  const database = proxyFor(storage, pluginId);
  await migrate(
    database,
    async (queries) => {
      storage.execute(
        pluginId,
        queries.map((sql) => ({ sql, params: [], method: runMethod })),
      );
    },
    { migrationsFolder: migrations },
  );
  await database.insert(tasks).values({ title: taskTitle });

  expect(
    await database.select().from(tasks).where(eq(tasks.title, taskTitle)),
  ).toEqual([{ id: 1, title: taskTitle }]);
});

it('attaches a Plugin file read-only to the Server database and creates nothing for a Plugin that never stored', async () => {
  const { home, storage } = await startStorage();
  storage.execute('weather', [
    { sql: 'create table cache (value text)', params: [], method: runMethod },
    { sql: 'insert into cache values (?)', params: ['sunny'], method: 'run' },
  ]);

  const server = openDatabase(join(home, 'argo.db')).$client;
  onTestFinished(() => server.close());

  expect(storage.attachReadOnly(server, 'never-stored', 'idle')).toBe(false);
  expect(storage.attachReadOnly(server, 'weather', 'weather')).toBe(true);
  expect(server.prepare('select value from weather.cache').all()).toEqual([
    { value: 'sunny' },
  ]);
  expect(() => server.exec("insert into weather.cache values ('x')")).toThrow(
    /readonly/,
  );
});

it('rolls a failed batch back and rejects a Plugin id that would leave the plugin-data folder', async () => {
  const { storage } = await startStorage();
  storage.execute(pluginId, [
    { sql: 'create table t (x integer)', params: [], method: runMethod },
  ]);

  expect(() =>
    storage.execute(pluginId, [
      { sql: 'insert into t values (1)', params: [], method: runMethod },
      { sql: 'insert into missing values (1)', params: [], method: runMethod },
    ]),
  ).toThrow(/no such table/);
  expect(
    storage.execute(pluginId, [
      { sql: 'select count(*) from t', params: [], method: 'get' },
    ]),
  ).toEqual([{ rows: [0] }]);
  expect(() => storage.fileOf('../escape')).toThrow('Invalid Plugin id');
});
