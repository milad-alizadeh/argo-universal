import { startEngineTestHost } from '@repo/engine/mocks';
import { AppPageSocket } from '@repo/engine/mocks/app-socket';
import type { AppRouter } from '@repo/engine/router';
import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { TRPCClientError, type TRPCClientErrorLike } from '@trpc/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { holdCacheOnline } from '../stores/cache-online';
import type { Connection, ConnectionState } from '../stores/connection';
import { openConnection } from './open-connection';

const closers: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  vi.unstubAllGlobals();

  for (const close of closers.splice(0).reverse()) await close();
});

// A Server on `port`, or on a free one without it. `stop` drops every Connection, as an Engine restart does.
async function startServer(
  options: { port?: number; version?: string } = {},
): Promise<{ url: string; port: number; stop: () => Promise<void> }> {
  // Node writes no Origin, so the App stands in for its own page, which is what proves the Server Device (#1696).
  vi.stubGlobal('WebSocket', AppPageSocket);

  const host = await startEngineTestHost({ version: '1.2.3', ...options });
  const url = new URL(host.url);
  url.protocol = 'ws:';

  return { url: url.toString(), port: Number(url.port), stop: host.stop };
}

// The Server being looked at drives the cache's online flag, so its queries pause and refetch with it.
const lookedAt = (connection: Connection): void => {
  closers.push(holdCacheOnline(connection));
};

// A mounted client, as QueryClientProvider mounts it, refetches when onlineManager comes back online.
function mountedQueryClient(): QueryClient {
  const queryClient = new QueryClient();
  queryClient.mount();
  closers.push(() => queryClient.unmount());

  return queryClient;
}

const waitForConnectionLink = (
  connection: Connection,
  expectedLink: ConnectionState,
): Promise<void> =>
  vi.waitFor(() => expect(connection.state()).toBe(expectedLink), {
    timeout: 5000,
  });

interface DroppedCall {
  error: TRPCClientErrorLike<AppRouter>;
  state: ConnectionState;
}

// What a live subscription, such as a Session's Feed, hears when the Server goes, and the Connection's state then.
async function droppedSubscription(): Promise<DroppedCall> {
  const server = await startServer();
  const { client, connection, close } = openConnection(server.url);

  closers.push(close);
  const live = Promise.withResolvers<void>();
  const dropped = Promise.withResolvers<DroppedCall>();

  const subscription = client.system.clock.subscribe(undefined, {
    onData: () => live.resolve(),
    onConnectionStateChange: (change) => {
      if (change.state === 'connecting' && change.error)
        dropped.resolve({ error: change.error, state: connection.state() });
    },
  });

  closers.push(() => subscription.unsubscribe());
  await live.promise;
  await server.stop();

  return dropped.promise;
}

describe('openConnection', (): void => {
  // A call reads as dropped from the Connection's own state, so the Connection must be down first.
  it('shows Reconnecting before a dropped call hears the Server gave no answer', async () => {
    const { error, state } = await droppedSubscription();

    expect(state).toBe('reconnecting');
    expect(error).toBeInstanceOf(TRPCClientError);
    expect(error.shape).toBeUndefined();
  });

  it('reconnects after the Server restarts and fetches every query again', async (): Promise<void> => {
    const server = await startServer();
    const queryClient = mountedQueryClient();

    const { client, connection, close } = openConnection(server.url);

    closers.push(close);
    lookedAt(connection);
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
    const queryClient = mountedQueryClient();

    const { client, connection, close } = openConnection(stopped.url);

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
    const { connection, close } = openConnection(unused.url);
    await waitForConnectionLink(connection, 'reconnecting');

    await expect(close()).resolves.toBeUndefined();
  });
});
