import type { ServerAddress, SessionCounts } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { createTRPCClient, createWSClient, wsLink } from '@trpc/client';
import { type EventObject, fromCallback } from 'xstate';

export type CountsReport =
  | { type: 'counts.changed'; counts: SessionCounts }
  | { type: 'counts.disconnected' };

// This Connection observes Sessions only. The Supervisor owns Engine recovery.
export const watchSessionCounts = fromCallback<
  EventObject,
  Pick<ServerAddress, 'port'>
>(({ input, sendBack }): (() => void) => {
  const disconnected = (): void =>
    sendBack({ type: 'counts.disconnected' } satisfies CountsReport);

  const socket = createWSClient({
    url: `ws://127.0.0.1:${input.port}`,
    onClose: disconnected,
    onError: disconnected,
    keepAlive: { enabled: true, intervalMs: 5000, pongTimeoutMs: 1000 },
  });

  const client = createTRPCClient<AppRouter>({
    links: [wsLink<AppRouter>({ client: socket })],
  });

  const subscription = client.session.counts.subscribe(undefined, {
    onData: (counts): void =>
      sendBack({ type: 'counts.changed', counts } satisfies CountsReport),
    onError: disconnected,
    onComplete: disconnected,
  });

  return (): void => {
    subscription.unsubscribe();
    void socket.close();
  };
});
