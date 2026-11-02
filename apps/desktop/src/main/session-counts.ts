import type { ServerAddress, SessionCounts } from '@repo/contracts';
import type { AppRouter } from '@repo/engine/router';
import { readControlToken } from '@repo/engine/server-runtime';
import { once } from '@repo/process';
import { createTRPCClient, createWSClient, wsLink } from '@trpc/client';
import { type EventObject, fromCallback } from 'xstate';

export type CountsReport =
  | { type: 'counts.changed'; counts: SessionCounts }
  // The Server's setting for whether it outlives this App, read as the App lets go.
  | { type: 'keepRunning.changed'; enabled: boolean }
  // The Server stopped answering, by its own going or by this Connection letting go.
  | { type: 'counts.disconnected' }
  // The socket is closed, so nothing of this Connection is left to hold the App open.
  | { type: 'counts.released' };

// What the App sends this Connection to make it let go of the Server; `counts.released` answers it.
export const countsReleaseEvent = 'counts.release';

/*
 * How long quitting waits for that answer. The socket closes in well under a second,
 * and a Server that never closes it may not hold the App open.
 */
export const releaseLimitMs = 2000;

type Report = (event: CountsReport) => void;

// Where the Server listens, and the runtime folder whose token says this process is on the Server Device.
export interface CountsTarget extends Pick<ServerAddress, 'port'> {
  home: string;
}

const disconnect =
  (report: Report): (() => void) =>
  (): void =>
    report({ type: 'counts.disconnected' });

/*
 * This Connection has no page of its own, so it shows the user token the Server minted instead: the file is one only a process on the Server Device can read (ADR-0044), and nothing else proves which Device this is (#1696).
 * A token that cannot be read is left out, and the Server then answers the subscription with a refusal the machine reports as a disconnect.
 */
const connectionProof = async (
  home: string,
): Promise<Record<string, string>> => {
  const token = await readControlToken(home).catch((): undefined => undefined);

  return token === undefined ? {} : { token };
};

const released =
  (report: Report): (() => void) =>
  (): void => {
    disconnect(report)();
    report({ type: 'counts.released' });
  };

function openSocket(
  { port, home }: CountsTarget,
  report: Report,
): ReturnType<typeof createWSClient> {
  return createWSClient({
    url: `ws://127.0.0.1:${port}`,
    connectionParams: (): Promise<Record<string, string>> =>
      connectionProof(home),
    onClose: released(report),
    onError: disconnect(report),
    keepAlive: { enabled: true, intervalMs: 5000, pongTimeoutMs: 1000 },
  });
}

interface CountsConnection {
  // Reads the keep-running setting, reports it, then lets go of the Server.
  release: () => void;
  close: () => void;
}

type Client = ReturnType<typeof createTRPCClient<AppRouter>>;

type Subscription = { unsubscribe: () => void };

function watchCounts(client: Client, report: Report): Subscription {
  const disconnected = disconnect(report);

  return client.session.counts.subscribe(undefined, {
    onData: (counts): void => report({ type: 'counts.changed', counts }),
    onError: disconnected,
    onComplete: disconnected,
  });
}

// A Server that cannot answer reports nothing, so the machine reads the setting stored on disk instead of guessing.
function releaseAfterReading(
  client: Client,
  report: Report,
  close: () => void,
): () => void {
  return (): void => {
    void client.system.keepRunning
      .query()
      .then(({ enabled }): void =>
        report({ type: 'keepRunning.changed', enabled }),
      )
      .catch((): void => {})
      .finally(close);
  };
}

function observeCounts(
  socket: ReturnType<typeof createWSClient>,
  report: Report,
): CountsConnection {
  const client = createTRPCClient<AppRouter>({
    links: [wsLink<AppRouter>({ client: socket })],
  });

  const subscription = watchCounts(client, report);
  const close = once((): void => closeCounts(socket, subscription));

  return { release: releaseAfterReading(client, report, close), close };
}

function closeCounts(
  socket: ReturnType<typeof createWSClient>,
  subscription: Subscription,
): void {
  subscription.unsubscribe();
  void socket.close();
}

function subscribeCounts(
  target: CountsTarget,
  report: Report,
): CountsConnection {
  return observeCounts(openSocket(target, report), report);
}

/*
 * This Connection observes Sessions only. The Supervisor owns Engine recovery.
 * `counts.release` first reads whether the Server keeps running after the App quits, then closes the socket while the App still runs its loop: Electron tears its Node
 * environment down with the App, and a socket left closing then keeps the process alive long after the window goes.
 */
export const watchSessionCounts = fromCallback<EventObject, CountsTarget>(
  ({ input, sendBack, receive }): (() => void) => {
    const connection = subscribeCounts(input, sendBack);

    receive((event): void => {
      if (event.type === countsReleaseEvent) connection.release();
    });

    return connection.close;
  },
);
