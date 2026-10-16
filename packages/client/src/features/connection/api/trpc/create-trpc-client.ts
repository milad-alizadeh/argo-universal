import type { AppRouter } from '@repo/engine/router';
import * as trpc from '@trpc/client';

export interface ServerClient {
  client: trpc.TRPCClient<AppRouter>;
  webSocketClient: ReturnType<typeof trpc.createWSClient>;
  close: ReturnType<typeof trpc.createWSClient>['close'];
}

// An HTTP route on the Server's WebSocket address, such as tRPC at /trpc (ADR 0002).
export function serverHttpUrl(serverUrl: string, path: string): string {
  const url = new URL(path, serverUrl);
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';

  return url.toString();
}

function createWebSocketClient(
  serverUrl: string,
  beforeConnect: () => Promise<void>,
): ServerClient['webSocketClient'] {
  return trpc.createWSClient({
    // `beforeConnect` waits out the retry delay, so foreground and Try again can cut it short.
    url: async () => {
      await beforeConnect();

      return serverUrl;
    },
    retryDelayMs: () => 0,
    keepAlive: { enabled: true, intervalMs: 5000, pongTimeoutMs: 1000 },
  });
}

function createServerClient(
  serverUrl: string,
  webSocketClient: ServerClient['webSocketClient'],
): ServerClient['client'] {
  return trpc.createTRPCClient<AppRouter>({
    links: [
      trpc.splitLink({
        condition: (operation) => trpc.isNonJsonSerializable(operation.input),
        true: trpc.httpLink({ url: serverHttpUrl(serverUrl, '/trpc') }),
        false: trpc.wsLink<AppRouter>({ client: webSocketClient }),
      }),
    ],
  });
}

// Every tRPC call goes over one WebSocket to the Server, except a call with a file, which goes over HTTP (ADR 0002).
export function createTRPCClient(
  serverUrl: string,
  beforeConnect: () => Promise<void> = async (): Promise<void> => {},
): ServerClient {
  const webSocketClient = createWebSocketClient(serverUrl, beforeConnect);
  const client = createServerClient(serverUrl, webSocketClient);

  return { client, webSocketClient, close: () => webSocketClient.close() };
}

export type ClientError = trpc.TRPCClientErrorLike<AppRouter>;
