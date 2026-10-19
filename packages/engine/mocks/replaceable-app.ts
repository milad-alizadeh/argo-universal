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

export function renderApp(
  url: string,
  input: ReplaceableInput,
  surface: Partial<PluginSurface>,
): RenderApp {
  const socket = createWSClient({
    url: url.replace('http:', 'ws:'),
    connectionParams: { pluginSurface: JSON.stringify(surface) },
  });

  const client = createTRPCClient<AppRouter>({
    links: [wsLink({ client: socket })],
  });

  const messages: ReplaceableMessage[] = [];

  const subscription = client.plugins.render.subscribe(input, {
    onData: (message) => messages.push(message),
  });

  onTestFinished(async () => {
    subscription.unsubscribe();
    await socket.close();
  });

  return { client, messages, stop: (): void => subscription.unsubscribe() };
}
