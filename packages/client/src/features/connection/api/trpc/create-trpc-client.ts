import { observedAppSocket } from '@repo/contracts/app-web-socket';
import {
  currentPluginSurface,
  type PluginSurface,
} from '@repo/contracts/plugins/kit';
import type { AppRouter } from '@repo/engine/router';
import * as trpc from '@trpc/client';
import { observable } from '@trpc/server/observable';
import { bytesHex } from '../channel/bytes';
import { appChannelPlatform } from '../channel/channel-platform';
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

const appInstanceBytes = 16;

interface ClientOptions {
  surface?: () => PluginSurface;
  channel?: ChannelTransport;
  keepAlive?: { intervalMs: number; pongTimeoutMs: number };
}

// A Connection that died without closing, after a Wi-Fi change for example, is noticed within about this long.
const defaultKeepAlive = { intervalMs: 5000, pongTimeoutMs: 3000 };

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
  {
    surface = appSurface,
    channel,
    keepAlive = defaultKeepAlive,
  }: ClientOptions,
): ServerClient['webSocketClient'] {
  const appInstance = bytesHex(
    appChannelPlatform.randomBytes(appInstanceBytes),
  );

  return trpc.createWSClient({
    WebSocket: observedAppSocket(channel?.WebSocket ?? WebSocket),
    url: urlAfter(serverUrl, beforeConnect),
    connectionParams: () => ({
      appInstance,
      pluginSurface: JSON.stringify(surface()),
    }),
    retryDelayMs: () => 0,
    keepAlive: { enabled: true, ...keepAlive },
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

const isFeedSubscription = (operation: trpc.Operation): boolean =>
  operation.type === 'subscription' && operation.path === 'feed.subscribe';

/*
 * tRPC's own client sends every open subscription again, with the input it opened with, when its socket reconnects. A Feed that did would replay from the point it first opened at, and race the App's own reopen after the revision the cache holds.
 * So a Feed subscription ends with an error when its socket is lost, and the App opens a new one after the cached revision.
 */
const endsWhenSocketIsLost =
  (inner: trpc.TRPCLink<AppRouter>): trpc.TRPCLink<AppRouter> =>
  (runtime) => {
    const link = inner(runtime);

    return (operation) =>
      observable((observer) => {
        let heard = false;

        const subscription = link(operation).subscribe({
          next: (value) => {
            const { type } = value.result;

            const lost =
              heard && type === 'state' && value.result.state === 'connecting';

            if (type !== 'state') heard = true;

            // The error ends this observable, whose teardown ends the inner one and takes it off tRPC's list to send again.
            if (lost)
              observer.error(
                trpc.TRPCClientError.from(new Error('The socket was lost')),
              );
            else observer.next(value);
          },
          error: (error) => observer.error(error),
          complete: () => observer.complete(),
        });

        return () => subscription.unsubscribe();
      });
  };

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
        false: trpc.splitLink({
          condition: isFeedSubscription,
          true: endsWhenSocketIsLost(
            trpc.wsLink<AppRouter>({ client: webSocketClient }),
          ),
          false: trpc.wsLink<AppRouter>({ client: webSocketClient }),
        }),
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
