import { once } from 'node:events';
import { session } from '@repo/db/schema';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished, vi } from 'vitest';
import { WebSocket } from 'ws';
import { openTestDatabase, readAddedAgentRows } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';

it('serves its SQLite last-good catalog over HTTP after the actual Engine restarts offline', async (): Promise<void> => {
  const stored = openTestDatabase();
  stored.database.$client.close();
  onTestFinished(stored.remove);
  const fetchAgents = vi.fn<() => Promise<unknown>>(
    async (): Promise<unknown> => publishedRegistry,
  );
  const first = await startEngineTestHost({
    home: stored.directory,
    fetchAgents,
  });
  const history = (await first.caller.session.list({ archived: false }))
    .sessions;
  const savedSessions = first.database.select().from(session).all();
  expect(fetchAgents).not.toHaveBeenCalled();
  const beforeSync = await fetch(`${first.url}/trpc/agents.catalog`);
  expect(await beforeSync.json()).toMatchObject({
    result: { data: { agents: [], status: 'unavailable' } },
  });
  expect(fetchAgents).not.toHaveBeenCalled();
  await fetch(`${first.url}/trpc/agents.syncCatalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  await expect
    .poll(async () => (await first.caller.agents.catalog()).syncStatus)
    .toBe('idle');
  const accepted = await fetch(`${first.url}/trpc/agents.catalog`);
  const acceptedCatalog = await first.caller.agents.catalog();
  expect({
    status: accepted.status,
    response: await accepted.json(),
    metadata: acceptedCatalog.agents.map(({ entry }) => entry),
  }).toMatchObject({
    status: 200,
    response: {
      result: {
        data: {
          status: 'fresh',
          rejectedValues: 0,
          agents: acceptedCatalog.agents,
        },
      },
    },
    metadata: publishedRegistry.agents,
  });
  const row = readAddedAgentRows(first.database);
  await first.stop();
  expect(fetchAgents).toHaveBeenCalledTimes(1);
  fetchAgents.mockRejectedValue(new Error('Registry is offline'));
  const restarted = await startEngineTestHost({
    home: stored.directory,
    fetchAgents,
  });
  await fetch(`${restarted.url}/trpc/agents.syncCatalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  await expect
    .poll(async () => (await restarted.caller.agents.catalog()).syncStatus, {
      timeout: 4500,
    })
    .toBe('failed');
  const stale = await fetch(`${restarted.url}/trpc/agents.catalog`);
  expect({ status: stale.status, response: await stale.json() }).toMatchObject({
    status: 200,
    response: {
      result: {
        data: {
          status: 'stale',
          rejectedValues: 0,
          error: 'Registry is offline',
          fetchedAt: row?.[0]?.catalogSyncedAt,
          agents: acceptedCatalog.agents,
        },
      },
    },
  });
  expect(
    (await restarted.caller.agents.catalog({ search: 'PYTHON' })).agents.map(
      ({ entry }) => entry.id,
    ),
  ).toEqual(['python-agent']);
  expect(fetchAgents).toHaveBeenCalledTimes(4);
  expect({
    history: (await restarted.caller.session.list({ archived: false }))
      .sessions,
    rows: readAddedAgentRows(restarted.database),
    sessions: restarted.database.select().from(session).all(),
  }).toEqual({ history, rows: row, sessions: savedSessions });
  expect(
    readAddedAgentRows(restarted.database).map((record) =>
      JSON.parse(record.registryMetadata ?? 'null'),
    ),
  ).toEqual(publishedRegistry.agents);
});

it('completes admitted sync after its WebSocket disconnects and serves the committed catalog over HTTP', async () => {
  const upstream = Promise.withResolvers<unknown>();
  const host = await startEngineTestHost({
    fetchAgents: async () => upstream.promise,
  });
  const socket = new WebSocket(host.url.replace('http:', 'ws:'));
  onTestFinished(() => socket.terminate());
  await once(socket, 'open');
  const admitted = once(socket, 'message');
  socket.send(
    JSON.stringify({
      id: 1,
      method: 'mutation',
      params: { path: 'agents.syncCatalog' },
    }),
  );
  const [message] = await admitted;
  expect(JSON.parse(String(message))).toMatchObject({
    result: { data: { accepted: true } },
  });
  const closed = once(socket, 'close');
  socket.close();
  await closed;
  upstream.resolve(publishedRegistry);
  await expect
    .poll(async () => {
      const response = await fetch(`${host.url}/trpc/agents.catalog`);
      return response.json();
    })
    .toMatchObject({
      result: {
        data: {
          syncStatus: 'idle',
          status: 'fresh',
          agents: expect.arrayContaining([
            expect.objectContaining({ entry: publishedRegistry.agents[0] }),
          ]),
        },
      },
    });
});
