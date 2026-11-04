import type { PluginSurface } from '@repo/contracts/plugins/kit';
import type {
  ReplaceableAnswer,
  ReplaceableInput,
} from '@repo/contracts/plugins/replaceable';
import { createTRPCClient, wsLink, type TRPCClient } from '@trpc/client';
import { onTestFinished } from 'vitest';
import type { AppRouter } from '../src/engine/router';
import { pluginSocket } from './plugin-socket';

interface RenderApp {
  client: TRPCClient<AppRouter>;
  answer: ReplaceableAnswer;
}

// One Replaceable Slot asked once over a Connection with this surface, as the App asks it.
export async function renderApp(
  url: string,
  input: ReplaceableInput,
  surface: Partial<PluginSurface>,
): Promise<RenderApp> {
  const socket = pluginSocket(url, surface);

  onTestFinished(() => socket.close());

  const client = createTRPCClient<AppRouter>({
    links: [wsLink({ client: socket })],
  });

  return { client, answer: await client.plugins.render.query(input) };
}
