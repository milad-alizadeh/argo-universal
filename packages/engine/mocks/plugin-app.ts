import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import type {
  ViewMessage,
  PluginDispatchInput,
  PluginViewInput,
} from '@repo/contracts/plugins/wire';
import {
  createTRPCClient,
  createWSClient,
  wsLink,
  type TRPCClient,
} from '@trpc/client';
import { onTestFinished } from 'vitest';
import type { AppRouter } from '../src/engine/router';

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
  const socket = createWSClient({
    url: url.replace('http:', 'ws:'),
    connectionParams: { pluginSurface: JSON.stringify(currentSurface) },
  });

  const client = createTRPCClient<AppRouter>({
    links: [wsLink({ client: socket })],
  });

  const messages: ViewMessage[] = [];

  const subscription = client.plugins.view.subscribe(page, {
    onData: (message) => messages.push(message),
  });

  onTestFinished(async () => {
    subscription.unsubscribe();
    await socket.close();
  });

  return { client, messages, stop: () => subscription.unsubscribe() };
}

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
