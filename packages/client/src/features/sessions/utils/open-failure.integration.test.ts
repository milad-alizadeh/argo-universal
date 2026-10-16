import { startEngineTestHost } from '@repo/engine/mocks';
import type { AppRouter } from '@repo/engine/router';
import * as trpc from '@trpc/client';
import { afterEach, expect, it } from 'vitest';
import { connectionDropped, openErrorOf } from './open-failure';
import { droppedConnectionToast } from './session-toasts';

const closers: (() => void)[] = [];

afterEach(() => {
  for (const close of closers.splice(0)) close();
});

// A WebSocket client like the App's that stops reconnecting once the Server has gone.
function connect(url: string, gone: () => boolean): trpc.TRPCClient<AppRouter> {
  const webSocket = trpc.createWSClient({
    url: async () => {
      if (gone()) await new Promise<never>(() => {});

      return url;
    },
    retryDelayMs: () => 0,
  });

  closers.push(() => void webSocket.close());

  return trpc.createTRPCClient<AppRouter>({
    links: [trpc.wsLink<AppRouter>({ client: webSocket })],
  });
}

// What a live subscription, such as a Session's Feed, hears when its WebSocket closes under it.
type DroppedError = trpc.TRPCClientError<AppRouter>;

async function droppedSubscriptionError(): Promise<DroppedError> {
  const host = await startEngineTestHost();
  let stopped = false;
  const client = connect(host.url.replace(/^http/, 'ws'), () => stopped);
  const live = Promise.withResolvers<void>();
  const dropped = Promise.withResolvers<DroppedError>();

  const subscription = client.system.clock.subscribe(undefined, {
    onData: () => live.resolve(),
    onError: dropped.reject,
    onConnectionStateChange: (change) => {
      if (change.state === 'connecting' && change.error)
        dropped.resolve(change.error);
    },
  });

  closers.push(() => subscription.unsubscribe());

  await live.promise;
  stopped = true;
  await host.stop();

  return dropped.promise;
}

it('reads a dropped Connection as no open failure, which a toast reports', async () => {
  const error = await droppedSubscriptionError();

  expect(connectionDropped(error)).toBe(true);
  expect(openErrorOf(error)).toBeUndefined();
  expect(
    droppedConnectionToast({ opens: [], feed: error, opened: true }),
  ).toMatchObject({ title: 'Connection lost' });
});
