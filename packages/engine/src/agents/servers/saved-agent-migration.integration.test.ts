import { mkdir, mkdtemp, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrationsFolder, openDatabase, type Database } from '@repo/db';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';

const enabledId = 'old-enabled';

const enabledRegistryId = 'enabled-acp';

const disabledId = 'old-disabled';

const disabledRegistryId = 'disabled-acp';

const removedId = 'old-removed';

const previousMigrations = async (directory: string): Promise<string> => {
  const previous = join(directory, 'previous');
  await mkdir(previous);

  for (const entry of await readdir(migrationsFolder)) {
    if (entry.includes('saved_agents')) continue;
    await symlink(join(migrationsFolder, entry), join(previous, entry), 'dir');
  }

  return previous;
};

const oldDatabase = async (): Promise<{ database: Database; home: string }> => {
  const home = await mkdtemp(join(tmpdir(), 'argo-saved-agents-'));

  const database = openDatabase(
    join(home, 'argo.db'),
    await previousMigrations(home),
  );

  onTestFinished(async () => {
    if (database.$client.isOpen) database.$client.close();
    await rm(home, { recursive: true, force: true });
  });
  database.$client.exec('DELETE FROM agents');

  return { database, home };
};

const registryConfiguration = (removed = false): string =>
  JSON.stringify({
    source: 'registry',
    removed,
    release: null,
    overrides: {
      args: ['--discard'],
      env: [
        { name: 'TOKEN', value: 'saved' },
        { name: 'OTHER', value: 'value' },
      ],
    },
  });

const seedDefinitions = (database: Database): void => {
  const insert = database.$client.prepare(
    'INSERT INTO agents (id, registry_id, configuration, enabled) VALUES (?, ?, ?, ?)',
  );

  insert.run(enabledId, enabledRegistryId, registryConfiguration(), 1);
  insert.run(disabledId, disabledRegistryId, registryConfiguration(), 0);
  insert.run(removedId, 'removed-acp', registryConfiguration(true), 1);
  insert.run('catalog-only', 'catalog-acp', null, 1);
  insert.run(
    'custom',
    null,
    JSON.stringify({
      source: 'custom',
      definition: { name: 'Custom', command: 'custom', args: [], env: [] },
    }),
    1,
  );
  database.$client.exec(
    "INSERT INTO project (id, path, name) VALUES ('project', '/project', 'Project')",
  );

  const session = database.$client.prepare(
    "INSERT INTO session (id, project_id, agent, checkout_path, projection_version) VALUES (?, 'project', ?, '/project', 1)",
  );

  for (const id of [enabledId, disabledId, removedId, 'custom'])
    session.run(id, id);
};

it('Migration B copies saved Registry choices, including disabled ones, and preserves Session identities', async () => {
  const { database, home } = await oldDatabase();
  seedDefinitions(database);
  database.$client.close();
  const host = await startEngineTestHost({ home, fixtureAgents: [] });
  expect(
    host.database.$client
      .prepare('SELECT * FROM agent_servers ORDER BY id')
      .all(),
  ).toEqual([
    { id: disabledRegistryId, env: '{"TOKEN":"saved","OTHER":"value"}' },
    { id: enabledRegistryId, env: '{"TOKEN":"saved","OTHER":"value"}' },
  ]);
  expect(
    host.database.$client
      .prepare("SELECT id FROM agents WHERE id = 'custom'")
      .get(),
  ).toBeUndefined();
  expect(
    host.database.$client
      .prepare('SELECT id, agent FROM session ORDER BY id')
      .all(),
  ).toEqual([
    { id: 'custom', agent: 'custom' },
    { id: disabledId, agent: disabledRegistryId },
    { id: enabledId, agent: enabledRegistryId },
    { id: removedId, agent: 'removed-acp' },
  ]);
});

it('Migration B leaves a fresh Server with no installed Agents', async () => {
  const host = await startEngineTestHost({ fixtureAgents: [] });
  expect(await host.caller.agents.servers()).toEqual([]);
  expect(
    host.database.$client.prepare('SELECT * FROM agent_servers').all(),
  ).toEqual([]);
});
