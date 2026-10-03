import type { AppRouter } from '@repo/api';
import * as trpc from '@trpc/client';

// Every tRPC call goes over one WebSocket to the Server (ADR 0002).
export function createTRPCClient(url: () => Promise<string>) {
  const webSocketClient = trpc.createWSClient({
    // `url` waits out the retry delay, so the Connection machine can cut it short (spec 0002 section 11).
    url,
    retryDelayMs: () => 0,
    keepAlive: { enabled: true, intervalMs: 5000, pongTimeoutMs: 1000 },
  });
  const client = trpc.createTRPCClient<AppRouter>({
    links: [trpc.wsLink<AppRouter>({ client: webSocketClient })],
  });
  return { client, webSocketClient, close: () => webSocketClient.close() };
}

export type TRPCClient = ReturnType<typeof createTRPCClient>['client'];
