import { join } from 'node:path';
import { openDatabase } from '@repo/db';
import { openPreSpecDatabaseWithHistory } from '@repo/db/mocks';
import { agents, session, turn, feedRow } from '@repo/db/schema';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished } from 'vitest';
import { startRouterTestHost } from '#mocks/router';

it('adds Agents to the main schema and preserves saved Session history through restart', async (): Promise<void> => {
  const stored = openPreSpecDatabaseWithHistory(appFixtureAgentIds);
  onTestFinished(() => stored.remove());
  const history = stored.database.select().from(session).all();
  const turns = stored.database.select().from(turn).all();
  const feed = stored.database.select().from(feedRow).all();
  stored.database.$client.close();
  const database = openDatabase(join(stored.directory, 'argo.db'));
  const first = startRouterTestHost({
    database,
    fetchAgents: async (): Promise<unknown> => publishedRegistry,
  });
  expect(database.select().from(session).all()).toEqual(history);
  expect(database.select().from(turn).all()).toEqual(turns);
  expect(database.select().from(feedRow).all()).toEqual(feed);
  expect(database.select().from(agents).all()).toEqual([]);
  const savedSessions = (await first.caller.session.list({ archived: false }))
    .sessions;
  expect(savedSessions.map(({ agent }) => agent).sort()).toEqual(
    [...appFixtureAgentIds].sort(),
  );
  await first.caller.agents.syncCatalog();
  const accepted = await first.caller.agents.catalog();
  await first.stop();
  database.$client.close();
  const reopened = openDatabase(join(stored.directory, 'argo.db'));
  onTestFinished(() => reopened.$client.close());
  const second = startRouterTestHost({ database: reopened });
  expect(
    (await second.caller.session.list({ archived: false })).sessions,
  ).toEqual(savedSessions);
  expect(reopened.select().from(turn).all()).toEqual(turns);
  expect(reopened.select().from(feedRow).all()).toEqual(feed);
  expect((await second.caller.agents.catalog()).agents).toEqual(
    accepted.agents,
  );
});
