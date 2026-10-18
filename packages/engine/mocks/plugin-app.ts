import type { ViewMessage } from '@repo/contracts/plugins/wire';
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

export function connectPluginApp(
  url: string,
  page: { pluginId: string; path: string },
): PluginApp {
  const socket = createWSClient({ url: url.replace('http:', 'ws:') });

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
