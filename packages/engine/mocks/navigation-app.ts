import type { NavigationStreamEvent } from '@repo/contracts/navigation';
import type { PluginSurface } from '@repo/contracts/plugins/kit';
import {
  createTRPCClient,
  createWSClient,
  wsLink,
  type TRPCClient,
} from '@trpc/client';
import { onTestFinished } from 'vitest';
import type { AppRouter } from '../src/engine/router';

type Ready = Extract<NavigationStreamEvent, { type: 'ready' }>;

type Opened = Extract<NavigationStreamEvent, { type: 'open' }>;

export interface NavigationApp {
  client: TRPCClient<AppRouter>;
  opened: Opened['destination'][];
  ready: Promise<Ready>;
  close: () => Promise<void>;
}

const socketTo = (
  url: string,
  surface: Partial<PluginSurface>,
): ReturnType<typeof createWSClient> =>
  createWSClient({
    url: url.replace('http:', 'ws:'),
    connectionParams: { pluginSurface: JSON.stringify(surface) },
  });

interface Listening {
  ready: Promise<Ready>;
  stop: () => void;
}

const listen = (
  client: TRPCClient<AppRouter>,
  opened: Opened['destination'][],
): Listening => {
  const ready = Promise.withResolvers<Ready>();

  const subscription = client.navigation.requests.subscribe(undefined, {
    onData: (event) =>
      event.type === 'ready'
        ? ready.resolve(event)
        : opened.push(event.destination),
    onError: (error) => ready.reject(error),
  });

  return { ready: ready.promise, stop: () => subscription.unsubscribe() };
};

const clientOver = (
  socket: ReturnType<typeof createWSClient>,
): TRPCClient<AppRouter> =>
  createTRPCClient<AppRouter>({ links: [wsLink({ client: socket })] });

// An App Connection that reports its platform, and listens for the destinations the Server sends it.
export function connectNavigationApp(
  url: string,
  surface: Partial<PluginSurface>,
): NavigationApp {
  const socket = socketTo(url, surface);
  const client = clientOver(socket);
  const opened: Opened['destination'][] = [];
  const { ready, stop } = listen(client, opened);

  const close = async (): Promise<void> => {
    stop();
    await socket.close();
  };

  onTestFinished(close);

  return { client, opened, ready, close };
}
