import { createRouterHost } from '@repo/engine/mocks';
import { appRouter } from '@repo/engine/router';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebSocketServer } from 'ws';
import { waitFor } from 'xstate';
import { type ConnectionActor, openConnection } from './open-connection';

const closers: (() => unknown)[] = [];
afterEach(async () => {
  for (const close of closers.splice(0).reverse()) await close();
});

// A Server on `port`; 0 picks a free one. `stop` drops every Connection, as an Engine restart does.
async function startServer(
  port = 0,
  version = '1.2.3',
): Promise<{ url: string; port: number; stop: () => Promise<void> }> {
  const { context } = createRouterHost({ version });
  const server = new WebSocketServer({ host: '127.0.0.1', port });
  await new Promise((resolve) => server.once('listening', resolve));
  applyWSSHandler({
    wss: server,
    router: appRouter,
    createContext: () => context,
  });
  const stop = (): Promise<void> =>
    new Promise<void>((resolve) => {
      for (const client of server.clients) client.terminate();
      server.close(() => resolve());
    });
  closers.push(stop);
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Server has no TCP address');
  return { url: `ws://127.0.0.1:${address.port}`, port: address.port, stop };
}

const linkIs = (
  connection: ConnectionActor,
  link: string,
): ReturnType<typeof waitFor<ConnectionActor>> =>
  waitFor(connection, (snapshot) => snapshot.value.link === link, {
    timeout: 5000,
  });

describe('openConnection', (): void => {
  it('reconnects after the Server restarts and fetches every query again', async (): Promise<void> => {
    const server = await startServer();
    const queryClient = new QueryClient();
    const { client, connection, close } = openConnection(
      server.url,
      queryClient,
    );
    closers.push(close);
    await linkIs(connection, 'open');
    // An observed query, as a mounted screen has; invalidation refetches only those.
    const observer = new QueryObserver(queryClient, {
      queryKey: ['system.info'],
      queryFn: (): ReturnType<typeof client.system.info.query> =>
        client.system.info.query(),
    });
    closers.push(observer.subscribe(() => {}));
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().data?.version).toBe('1.2.3'),
    );

    await server.stop();
    await linkIs(connection, 'reconnecting');
    await startServer(server.port, '1.2.4');
    await linkIs(connection, 'open');

    await vi.waitFor(() =>
      expect(observer.getCurrentResult().data?.version).toBe('1.2.4'),
    );
  });

  it('connects after an initial failure when the Server becomes available', async (): Promise<void> => {
    const stopped = await startServer();
    await stopped.stop();
    const queryClient = new QueryClient();
    const { client, connection, close } = openConnection(
      stopped.url,
      queryClient,
    );
    closers.push(close);
    const observer = new QueryObserver(queryClient, {
      queryKey: ['system.info'],
      queryFn: (): ReturnType<typeof client.system.info.query> =>
        client.system.info.query(),
    });
    closers.push(observer.subscribe(() => {}));
    await linkIs(connection, 'reconnecting');
    expect(observer.getCurrentResult().data).toBeUndefined();

    await startServer(stopped.port);
    await linkIs(connection, 'open');
    await vi.waitFor(() =>
      expect(observer.getCurrentResult().data?.version).toBe('1.2.3'),
    );
  });

  it('closes while an attempt waits for its retry delay', async () => {
    const unused = await startServer();
    await unused.stop();
    const { connection, close } = openConnection(unused.url, new QueryClient());
    await waitFor(
      connection,
      (snapshot) => snapshot.value.attempt === 'waiting',
      {
        timeout: 5000,
      },
    );

    await close();

    expect(connection.getSnapshot().status).toBe('stopped');
  });
});
