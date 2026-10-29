import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import type {
  ViewMessage,
  PluginDispatchInput,
  PluginViewInput,
} from '@repo/contracts/plugins/wire';
import { createTRPCClient, wsLink, type TRPCClient } from '@trpc/client';
import type { AppRouter } from '../src/engine/router';
import { closePluginSubscription, pluginSocket } from './plugin-socket';

export interface PluginApp {
  client: TRPCClient<AppRouter>;
  messages: ViewMessage[];
  stop: () => void;
}

const currentSurface = currentPluginSurface('web');

export function connectPluginApp(
  url: string,
  page: PluginViewInput,
): PluginApp {
  const socket = pluginSocket(url, currentSurface);

  const client = createTRPCClient<AppRouter>({
    links: [wsLink({ client: socket })],
  });

  const messages: ViewMessage[] = [];

  const stop = subscribeView(client, socket, { page, messages });

  return { client, messages, stop };
}

const subscribeView = (
  client: TRPCClient<AppRouter>,
  socket: ReturnType<typeof pluginSocket>,
  data: { page: PluginViewInput; messages: ViewMessage[] },
): (() => void) => {
  const subscription = client.plugins.view.subscribe(data.page, {
    onData: (message) => data.messages.push(message),
  });

  return closePluginSubscription(socket, subscription);
};

type TapTarget = Pick<PluginDispatchInput, 'pluginId' | 'path' | 'key'>;

export function pluginTap(
  view: ViewMessage | void,
  target: TapTarget,
): PluginDispatchInput {
  if (!view?.viewId) throw new Error('Expected a view identity');

  return {
    ...target,
    viewId: view.viewId,
    revision: view.revision,
    event: 'onPress',
  };
}
