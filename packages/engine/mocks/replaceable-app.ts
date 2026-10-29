import type { PluginSurface } from '@repo/contracts/plugins/kit';
import type {
  ReplaceableInput,
  ReplaceableMessage,
} from '@repo/contracts/plugins/replaceable';
import {
  createTRPCClient,
  createWSClient,
  wsLink,
  type TRPCClient,
} from '@trpc/client';
import { onTestFinished } from 'vitest';
import type { AppRouter } from '../src/engine/router';

interface RenderApp {
  client: TRPCClient<AppRouter>;
  messages: ReplaceableMessage[];
  stop: () => void;
}

const pluginSocket = (
  url: string,
  surface: Partial<PluginSurface>,
): ReturnType<typeof createWSClient> =>
  createWSClient({
    url: url.replace('http:', 'ws:'),
    connectionParams: { pluginSurface: JSON.stringify(surface) },
  });

export function renderApp(
  url: string,
  input: ReplaceableInput,
  surface: Partial<PluginSurface>,
): RenderApp {
  const socket = pluginSocket(url, surface);

  const client = createTRPCClient<AppRouter>({
    links: [wsLink({ client: socket })],
  });

  const messages: ReplaceableMessage[] = [];

  const stop = subscribe(client, socket, { input, messages });

  return { client, messages, stop };
}

const subscribe = (
  client: TRPCClient<AppRouter>,
  socket: ReturnType<typeof createWSClient>,
  data: { input: ReplaceableInput; messages: ReplaceableMessage[] },
): (() => void) => {
  const subscription = client.plugins.render.subscribe(data.input, {
    onData: (message) => data.messages.push(message),
  });

  onTestFinished(async () => {
    subscription.unsubscribe();
    await socket.close();
  });

  return (): void => subscription.unsubscribe();
};
