import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Database, migrationsFolder, openDatabase } from '@repo/db';
import { agents, project } from '@repo/db/schema';
import {
  fixtureAgents,
  fixtureRegistryIds,
} from '@repo/mocks/agent/app-fixtures';
import { expect, it, onTestFinished, vi } from 'vitest';
import { readConfiguredAgents } from './configuration-sql';

const configurationMigration = '20261010114515_agent_configuration';

const [claudeId, codexId] = fixtureAgents.map(({ agent }) => agent);

const registryConfiguration = {
  source: 'registry',
  release: null,
  overrides: { args: [], env: [] },
};

const copyMigrationsBefore = (directory: string): string => {
  const folder = join(directory, 'drizzle');

  for (const name of readdirSync(migrationsFolder))
    if (name < configurationMigration)
      cpSync(join(migrationsFolder, name), join(folder, name), {
        recursive: true,
      });

  return folder;
};

const seedHistory = (database: Database): void => {
  if (claudeId === undefined || codexId === undefined)
    throw new Error('Both fixture Agents are required to seed Session history');

  database
    .insert(project)
    .values({ id: 'project-1', path: '/p', name: 'p' })
    .run();

  const insertHistoricalSession = database.$client.prepare(
    "insert into session (id, project_id, agent, checkout_path, projection_version) values (?, 'project-1', ?, '/project', 1)",
  );

  insertHistoricalSession.run('first-session', claudeId);
  insertHistoricalSession.run('second-session', codexId);
  database.$client
    .prepare(
      "insert into agents (id, registry_id, catalog_present) values ('catalog-uuid', 'claude-acp', 1)",
    )
    .run();
  database.$client.close();
};

it('bootstraps the required Agent configurations, adopting their catalog rows, without touching existing Sessions', () => {
  const directory = mkdtempSync(join(tmpdir(), 'argo-bootstrap-'));
  onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'argo.db');
  seedHistory(openDatabase(file, copyMigrationsBefore(directory)));
  const database = openDatabase(file);
  onTestFinished(() => database.$client.close());
  expect(
    database
      .select({ id: agents.id, registryId: agents.registryId })
      .from(agents)
      .all(),
  ).toEqual([
    { id: claudeId, registryId: fixtureRegistryIds[0] },
    { id: codexId, registryId: fixtureRegistryIds[1] },
  ]);
  expect(readConfiguredAgents(database)).toEqual([
    { id: claudeId, enabled: true, configuration: registryConfiguration },
    { id: codexId, enabled: true, configuration: registryConfiguration },
  ]);
  expect(
    database.$client.prepare('select id, agent from session order by id').all(),
  ).toEqual([
    { id: 'first-session', agent: claudeId },
    { id: 'second-session', agent: codexId },
  ]);
});

it.each([
  { label: 'malformed JSON', configuration: '{broken' },
  { label: 'JSON of the wrong shape', configuration: '{"source":"elsewhere"}' },
])(
  'skips only the Agent whose stored configuration is $label',
  ({ configuration }) => {
    const directory = mkdtempSync(join(tmpdir(), 'argo-configuration-'));
    onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
    const database = openDatabase(join(directory, 'argo.db'));
    onTestFinished(() => database.$client.close());
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    database
      .insert(agents)
      .values([
        { id: 'damaged', configuration },
        {
          id: 'readable',
          configuration: JSON.stringify(registryConfiguration),
        },
      ])
      .run();
    expect(
      readConfiguredAgents(database).filter(({ id }) =>
        ['damaged', 'readable'].includes(id),
      ),
    ).toEqual([
      { id: 'readable', enabled: true, configuration: registryConfiguration },
    ]);
    expect(log).toHaveBeenCalledOnce();
  },
);
