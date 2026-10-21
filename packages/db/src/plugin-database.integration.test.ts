import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { pathToFileURL } from 'node:url';
import { expect, it, onTestFinished } from 'vitest';
import { openPluginDatabase, openReadOnlyDatabase } from './plugin-database';

const refused = /not authorized|authorization denied/;

const secret = 'victim-token';

async function openTwoPlugins(): Promise<{
  home: string;
  mine: DatabaseSync;
  theirFile: string;
}> {
  const home = await mkdtemp(join(tmpdir(), 'argo-plugin-database-'));
  const theirFile = join(home, 'theirs', 'plugin.db');
  const theirs = openPluginDatabase(theirFile);
  theirs.exec('create table tokens (secret text)');
  theirs.prepare('insert into tokens values (?)').run(secret);
  theirs.close();
  const mine = openPluginDatabase(join(home, 'mine', 'plugin.db'));

  onTestFinished(async () => {
    mine.close();
    await rm(home, { recursive: true, force: true });
  });

  return { home, mine, theirFile };
}

const theirRows = (file: string): unknown[] => {
  const theirs = openReadOnlyDatabase(file);
  const rows = theirs.prepare('select secret from tokens').all();
  theirs.close();

  return rows;
};

it('refuses to attach another Plugin file, by path, URI or alias', async () => {
  const { mine, theirFile } = await openTwoPlugins();

  expect(() => mine.exec(`attach database '${theirFile}' as theirs`)).toThrow(
    refused,
  );
  expect(() =>
    mine
      .prepare('attach database ? as theirs')
      .run(`${pathToFileURL(theirFile).href}?mode=rw`),
  ).toThrow(refused);
  expect(theirRows(theirFile)).toEqual([{ secret }]);
});

it('refuses to attach a scratch database to stage data in', async () => {
  const { mine } = await openTwoPlugins();

  expect(() => mine.exec("attach database ':memory:' as scratch")).toThrow(
    refused,
  );
  expect(() => mine.exec("detach database 'scratch'")).toThrow(refused);
});

it('refuses to copy itself to a path of its own choosing', async () => {
  const { home, mine } = await openTwoPlugins();
  const copy = join(home, 'exfiltrated.db');

  expect(() => mine.exec(`vacuum into '${copy}'`)).toThrow(refused);
  expect(existsSync(copy)).toBe(false);
});

it('refuses the pragmas that move where SQLite writes', async () => {
  const { home, mine } = await openTwoPlugins();

  expect(() => mine.exec(`pragma temp_store_directory = '${home}'`)).toThrow(
    refused,
  );
  expect(() => mine.exec(`pragma data_store_directory = '${home}'`)).toThrow(
    refused,
  );
});

it('refuses to load a native extension', async () => {
  const { mine } = await openTwoPlugins();

  expect(() =>
    mine.exec("select load_extension('/tmp/anything.dylib')"),
  ).toThrow(refused);
});

it('lists its own file and nothing else as open', async () => {
  const { mine, theirFile } = await openTwoPlugins();

  expect(() => mine.exec(`attach database '${theirFile}' as theirs`)).toThrow(
    refused,
  );
  expect(mine.prepare('pragma database_list').all()).toHaveLength(1);
});

it('still runs the Plugin its own arbitrary SQL, pragmas included', async () => {
  const { mine } = await openTwoPlugins();
  mine.exec('create table notes (id integer primary key, body text)');
  mine.prepare('insert into notes (body) values (?)').run('kept');
  mine.exec('pragma user_version = 3');

  expect(mine.prepare('select body from notes').all()).toEqual([
    { body: 'kept' },
  ]);
  expect(mine.prepare('pragma user_version').all()).toEqual([
    { user_version: 3 },
  ]);
  expect(mine.prepare('pragma table_info(notes)').all()).toHaveLength(2);
});
