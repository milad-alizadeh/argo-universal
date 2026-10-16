import { randomUUID } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { migrationsFolder, openDatabase, type Database } from '@repo/db';
import {
  identityRegistry as registry,
  legacyRegistryIdentities as identities,
} from '@repo/mocks/registry/legacy-identities';
import { onTestFinished } from 'vitest';
import type { readInstallSelection } from '../src/agents';

type Identity = (typeof identities)[number];

type Selection = NonNullable<ReturnType<typeof readInstallSelection>>;

const previousDatabase = async (home: string): Promise<Database> => {
  const previous = join(home, 'previous');
  await mkdir(previous);

  for (const migration of await readdir(migrationsFolder)) {
    if (migration >= '20261016150532_saved_agents') continue;
    await symlink(
      join(migrationsFolder, migration),
      join(previous, migration),
      'dir',
    );
  }

  const database = openDatabase(join(home, 'argo.db'), previous);
  onTestFinished(() => {
    if (database.$client.isOpen) database.$client.close();
  });
  database.$client
    .prepare(
      'INSERT INTO registry_cache (id, json, fetched_at) VALUES (1, ?, 0)',
    )
    .run(JSON.stringify(registry));
  database.$client.exec(
    "INSERT INTO project (id, path, name) VALUES ('project', '/project', 'Project')",
  );

  return database;
};

const seedReleaseFiles = async (
  home: string,
  identity: Identity,
  selection: Selection,
): Promise<void> => {
  const directory = join(
    home,
    'agents',
    identity.installationRoot,
    selection.directory,
  );

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'agent'), '#!/usr/bin/env node\n', {
    mode: 0o755,
  });
};

const seedAgent = async (
  {
    database,
    home,
    installed,
  }: { database: Database; home: string; installed: boolean },
  identity: Identity,
): Promise<void> => {
  const entry = registry.agents.find(({ id }) => id === identity.id);

  if (!entry) throw new Error('Registry identity fixture is missing');

  const selection: Selection = {
    directory: randomUUID(),
    executable: 'agent',
    entry: { ...entry, name: 'Older release name' },
    kind: 'npx',
    args: [],
    env: {},
  };

  const configuration = {
    source: 'registry',
    release: installed ? JSON.stringify(selection) : null,
    overrides: {
      args: [],
      env: [{ name: 'SAVED_ENV', value: identity.local }],
    },
  };

  database.$client
    .prepare(
      'INSERT INTO agents (id, registry_id, registry_metadata, catalog_present, configuration, enabled) VALUES (?, ?, ?, 1, ?, 0)',
    )
    .run(
      identity.local,
      identity.id,
      JSON.stringify({ ...entry, name: 'Old catalog name' }),
      JSON.stringify(configuration),
    );
  database.$client
    .prepare(
      "INSERT INTO session (id, project_id, agent, checkout_path, projection_version) VALUES (?, 'project', ?, '/project', 1)",
    )
    .run(identity.local, identity.local);

  if (installed) await seedReleaseFiles(home, identity, selection);
};

export const seedLegacyAgents = async (installed: boolean): Promise<string> => {
  const home = await mkdtemp(join(tmpdir(), 'argo-registry-identity-'));
  onTestFinished(() => rm(home, { recursive: true, force: true }));
  const database = await previousDatabase(home);

  for (const identity of identities)
    await seedAgent({ database, home, installed }, identity);
  database.$client.close();

  return home;
};
