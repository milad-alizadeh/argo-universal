import type { AppRouter } from '@repo/api';
import * as trpc from '@trpc/client';

// An HTTP route on the Server's WebSocket address, such as tRPC at /trpc (ADR 0002).
export function serverHttpUrl(serverUrl: string, path: string) {
  const url = new URL(path, serverUrl);
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  return url.toString();
}

// Every tRPC call goes over one WebSocket to the Server, except a call with a file, which goes over HTTP (ADR 0002).
export function createTRPCClient(
  serverUrl: string,
  beforeConnect: () => Promise<void> = async () => {},
) {
  const webSocketClient = trpc.createWSClient({
    // `beforeConnect` waits out the retry delay, so the Connection machine can cut it short.
    url: async () => {
      await beforeConnect();
      return serverUrl;
    },
    retryDelayMs: () => 0,
    keepAlive: { enabled: true, intervalMs: 5000, pongTimeoutMs: 1000 },
  });
  const client = trpc.createTRPCClient<AppRouter>({
    links: [
      trpc.splitLink({
        condition: (operation) => trpc.isNonJsonSerializable(operation.input),
        true: trpc.httpLink({ url: serverHttpUrl(serverUrl, '/trpc') }),
        false: trpc.wsLink<AppRouter>({ client: webSocketClient }),
      }),
    ],
  });
  return { client, webSocketClient, close: () => webSocketClient.close() };
}

export type TRPCClient = ReturnType<typeof createTRPCClient>['client'];
