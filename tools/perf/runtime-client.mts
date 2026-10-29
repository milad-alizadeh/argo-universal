import { FeedPageOutput, SessionGetOutput } from '@repo/contracts';
import {
  createTRPCUntypedClient,
  createWSClient,
  httpLink,
  splitLink,
  wsLink,
} from '@trpc/client';
import type { RuntimeTarget } from './runtime-types.mts';

export type RuntimeClient = ReturnType<typeof createTRPCUntypedClient>;

export interface RuntimeConnection {
  client: RuntimeClient;
  close: () => void;
}

function socketUrl(httpUrl: string): string {
  const url = new URL(httpUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  return url.href;
}

function controlLink(
  target: RuntimeTarget,
  signal: AbortSignal,
): ReturnType<typeof httpLink> {
  return httpLink({
    url: `${target.httpUrl}/trpc`,
    headers: { authorization: `Bearer ${target.token}` },
    fetch: (input, init) => fetch(input, { ...init, signal }),
  });
}

// The authenticated CLI control boundary and the App's public Feed subscription.
export function runtimeClient(
  target: RuntimeTarget,
  signal: AbortSignal,
): RuntimeConnection {
  const socket = createWSClient({ url: socketUrl(target.httpUrl) });

  const client = subscriptionClient(target, signal, socket);

  return {
    client,
    close: () => {
      void socket.close();
    },
  };
}

export const readRuntimeSession = async (
  client: RuntimeClient,
  sessionId: string,
): Promise<SessionGetOutput> =>
  SessionGetOutput.parse(await client.query('session.get', { sessionId }));

export const readRuntimePage = async (
  client: RuntimeClient,
  sessionId: string,
): Promise<FeedPageOutput> =>
  FeedPageOutput.parse(
    await client.query('feed.page', { sessionId, direction: 'tail' }),
  );

function subscriptionClient(
  target: RuntimeTarget,
  signal: AbortSignal,
  socket: ReturnType<typeof createWSClient>,
): RuntimeClient {
  return createTRPCUntypedClient({
    links: [
      splitLink({
        condition: (operation) => operation.type === 'subscription',
        true: wsLink({ client: socket }),
        false: controlLink(target, signal),
      }),
    ],
  });
}
