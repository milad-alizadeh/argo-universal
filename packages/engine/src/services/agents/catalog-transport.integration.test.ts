import { once } from 'node:events';
import { publishedRegistry } from '@repo/mocks/registry/catalog';
import { expect, it, onTestFinished } from 'vitest';
import { WebSocket } from 'ws';
import { startEngineTestHost } from '#mocks/engine';

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
