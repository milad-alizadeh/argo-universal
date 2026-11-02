import {
  currentPluginSurface,
  type PluginSurface,
} from '@repo/contracts/plugins/kit';
import type { AppRouter } from '@repo/engine/router';
import * as trpc from '@trpc/client';
import { pluginPlatform } from './plugin-platform';

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

// How tRPC reaches a paired Server: a WebSocket and a fetch that both run inside the encrypted channel, not on an address (ADR-0045).
export interface ChannelTransport {
  WebSocket: typeof WebSocket;
  fetch: typeof fetch;
}

// The address tRPC writes into a request that goes over a channel. The socket is already open to the one Server, so this names nothing.
export const channelServerUrl = 'wss://argo.channel/';

const appSurface = (): PluginSurface => currentPluginSurface(pluginPlatform());

interface ClientOptions {
  surface?: () => PluginSurface;
  channel?: ChannelTransport;
}

// `beforeConnect` waits out the retry delay, so foreground and Try again can cut it short.
const urlAfter =
  (serverUrl: string, beforeConnect: () => Promise<void>) =>
  async (): Promise<string> => {
    await beforeConnect();

    return serverUrl;
  };

function createWebSocketClient(
  serverUrl: string,
  beforeConnect: () => Promise<void>,
  { surface = appSurface, channel }: ClientOptions,
): ServerClient['webSocketClient'] {
  return trpc.createWSClient({
    ...(channel && { WebSocket: channel.WebSocket }),
    url: urlAfter(serverUrl, beforeConnect),
    connectionParams: () => ({ pluginSurface: JSON.stringify(surface()) }),
    retryDelayMs: () => 0,
    keepAlive: { enabled: true, intervalMs: 5000, pongTimeoutMs: 1000 },
  });
}

const httpLink = (
  serverUrl: string,
  channel?: ChannelTransport,
): ReturnType<typeof trpc.httpLink> =>
  trpc.httpLink({
    url: serverHttpUrl(serverUrl, '/trpc'),
    ...(channel && { fetch: channel.fetch }),
  });

function createServerClient(
  serverUrl: string,
  webSocketClient: ServerClient['webSocketClient'],
  channel?: ChannelTransport,
): ServerClient['client'] {
  return trpc.createTRPCClient<AppRouter>({
    links: [
      trpc.splitLink({
        condition: (operation) => trpc.isNonJsonSerializable(operation.input),
        true: httpLink(serverUrl, channel),
        false: trpc.wsLink<AppRouter>({ client: webSocketClient }),
      }),
    ],
  });
}

// Every tRPC call goes over one WebSocket to the Server, except a call with a file, which goes over HTTP (ADR 0002).
export function createTRPCClient(
  serverUrl: string,
  beforeConnect: () => Promise<void> = async (): Promise<void> => {},
  options: ClientOptions = {},
): ServerClient {
  const ws = createWebSocketClient(serverUrl, beforeConnect, options);
  const client = createServerClient(serverUrl, ws, options.channel);

  return { client, webSocketClient: ws, close: () => ws.close() };
}

export type ClientError = trpc.TRPCClientErrorLike<AppRouter>;
