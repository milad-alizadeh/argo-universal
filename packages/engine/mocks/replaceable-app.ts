import type { PluginSurface } from '@repo/contracts/plugins/kit';
import type {
  ReplaceableInput,
  ReplaceableMessage,
} from '@repo/contracts/plugins/replaceable';
import { createTRPCClient, wsLink, type TRPCClient } from '@trpc/client';
import type { AppRouter } from '../src/engine/router';
import { closePluginSubscription, pluginSocket } from './plugin-socket';

interface RenderApp {
  client: TRPCClient<AppRouter>;
  messages: ReplaceableMessage[];
  stop: () => void;
}

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
  socket: ReturnType<typeof pluginSocket>,
  data: { input: ReplaceableInput; messages: ReplaceableMessage[] },
): (() => void) => {
  const subscription = client.plugins.render.subscribe(data.input, {
    onData: (message) => data.messages.push(message),
  });

  return closePluginSubscription(socket, subscription);
};
