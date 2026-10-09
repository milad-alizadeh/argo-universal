import { join } from 'node:path';
import { openDatabase } from '@repo/db';
import { openLegacyCatalogDatabase } from '@repo/db/mocks';
import { agents, session, turn, feedRow } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished, vi } from 'vitest';
import { legacyLocalAgentId } from '#mocks/legacy-catalog-identities';
import { serializeLegacyCatalogAgentRows } from './catalog/records';

it.each(['valid', 'malformed', 'missing', 'duplicate'] as const)(
  'migrates %s legacy metadata without losing Session history',
  (kind): void => {
    const stored = openLegacyCatalogDatabase(legacyLocalAgentId);
    onTestFinished(() => stored.remove());
    const history = stored.database.select().from(session).all();
    const turns = stored.database.select().from(turn).all();
    const feed = stored.database.select().from(feedRow).all();
    const metadata =
      kind === 'duplicate'
        ? {
            ...publishedRegistry,
            agents: [publishedRegistry.agents[0], publishedRegistry.agents[0]],
          }
        : publishedRegistry;
    if (kind !== 'missing')
      stored.database.$client
        .prepare('INSERT INTO agent_catalog_cache VALUES (1, ?, ?)')
        .run(
          kind === 'malformed' ? '{broken' : JSON.stringify(metadata),
          1791504000000,
        );
    stored.database.$client.close();
    const report = vi.spyOn(console, 'error').mockImplementation(() => {});
    const database = openDatabase(join(stored.directory, 'argo.db'), {
      convertLegacyAgentCatalog: serializeLegacyCatalogAgentRows,
    });
    onTestFinished(() => database.$client.close());
    expect(database.select().from(session).all()).toEqual(history);
    expect(database.select().from(turn).all()).toEqual(turns);
    expect(database.select().from(feedRow).all()).toEqual(feed);
    const rows = database.select().from(agents).all();
    expect(
      rows.map((row) => JSON.parse(row.registryMetadata ?? 'null')),
    ).toEqual(kind === 'valid' ? publishedRegistry.agents : []);
    expect(
      database.$client
        .prepare(
          "SELECT name FROM sqlite_master WHERE name = 'agent_catalog_cache'",
        )
        .all(),
    ).toEqual([]);
    expect(report).toHaveBeenCalledTimes(
      kind === 'malformed' || kind === 'duplicate' ? 1 : 0,
    );
    expect(report.mock.calls.map(([message]) => message)).toEqual(
      Array.from(
        { length: kind === 'malformed' || kind === 'duplicate' ? 1 : 0 },
        () => expect.stringContaining('#1'),
      ),
    );
  },
);

it('refuses to silently discard an existing legacy catalog without its converter', (): void => {
  const stored = openLegacyCatalogDatabase(legacyLocalAgentId);
  onTestFinished(() => stored.remove());
  stored.database.$client
    .prepare('INSERT INTO agent_catalog_cache VALUES (1, ?, 1)')
    .run(JSON.stringify(publishedRegistry));
  const history = stored.database.select().from(session).all();
  expect(() => openDatabase(join(stored.directory, 'argo.db'))).toThrow(
    'Failed query',
  );
  expect(
    stored.database.$client
      .prepare('SELECT payload FROM agent_catalog_cache')
      .get(),
  ).toEqual({ payload: JSON.stringify(publishedRegistry) });
  expect(stored.database.select().from(session).all()).toEqual(history);
});
