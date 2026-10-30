import type { ServerAddress, SessionCounts } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { createTRPCClient, createWSClient, wsLink } from '@trpc/client';
import { type EventObject, fromCallback } from 'xstate';

export type CountsReport =
  | { type: 'counts.changed'; counts: SessionCounts }
  | { type: 'counts.disconnected' };

function openSocket(
  port: number,
  disconnected: () => void,
): ReturnType<typeof createWSClient> {
  return createWSClient({
    url: `ws://127.0.0.1:${port}`,
    onClose: disconnected,
    onError: disconnected,
    keepAlive: { enabled: true, intervalMs: 5000, pongTimeoutMs: 1000 },
  });
}

function observeCounts(
  socket: ReturnType<typeof createWSClient>,
  sendBack: (event: CountsReport) => void,
  disconnected: () => void,
): () => void {
  const client = createTRPCClient<AppRouter>({
    links: [wsLink<AppRouter>({ client: socket })],
  });

  const subscription = client.session.counts.subscribe(undefined, {
    onData: (counts): void => sendBack({ type: 'counts.changed', counts }),
    onError: disconnected,
    onComplete: disconnected,
  });

  return (): void => closeCounts(socket, subscription);
}

function closeCounts(
  socket: ReturnType<typeof createWSClient>,
  subscription: { unsubscribe: () => void },
): void {
  subscription.unsubscribe();
  void socket.close();
}

function subscribeCounts(
  port: number,
  sendBack: (event: CountsReport) => void,
): () => void {
  const disconnected = (): void => sendBack({ type: 'counts.disconnected' });
  const socket = openSocket(port, disconnected);

  return observeCounts(socket, sendBack, disconnected);
}

// This Connection observes Sessions only. The Supervisor owns Engine recovery.
export const watchSessionCounts = fromCallback<
  EventObject,
  Pick<ServerAddress, 'port'>
>(({ input, sendBack }): (() => void) => subscribeCounts(input.port, sendBack));
