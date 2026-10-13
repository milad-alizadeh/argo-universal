import { startEngineTestHost } from '@repo/engine/mocks';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from 'xstate';
import { type ConnectionActor, openConnection } from './open-connection';

const closers: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const close of closers.splice(0).reverse()) await close();
});

// A Server on `port`, or on a free one without it. `stop` drops every Connection, as an Engine restart does.
async function startServer(
  options: { port?: number; version?: string } = {},
): Promise<{ url: string; port: number; stop: () => Promise<void> }> {
  const host = await startEngineTestHost({ version: '1.2.3', ...options });
  const url = new URL(host.url);
  url.protocol = 'ws:';

  return { url: url.toString(), port: Number(url.port), stop: host.stop };
}

const waitForConnectionLink = (
  connection: ConnectionActor,
  expectedLink: string,
): ReturnType<typeof waitFor<ConnectionActor>> =>
  waitFor(connection, (snapshot) => snapshot.value.link === expectedLink, {
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
    await waitForConnectionLink(connection, 'open');

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
    await waitForConnectionLink(connection, 'reconnecting');
    await startServer({ port: server.port, version: '1.2.4' });
    await waitForConnectionLink(connection, 'open');

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
    await waitForConnectionLink(connection, 'reconnecting');
    expect(observer.getCurrentResult().data).toBeUndefined();

    await startServer({ port: stopped.port });
    await waitForConnectionLink(connection, 'open');
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
