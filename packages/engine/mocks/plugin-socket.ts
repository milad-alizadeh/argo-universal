import type { PluginSurface } from '@repo/contracts/plugins/kit';
import { createWSClient } from '@trpc/client';
import { AppPageSocket } from './app-socket';

export const pluginSocket = (
  url: string,
  surface: Partial<PluginSurface>,
): ReturnType<typeof createWSClient> =>
  createWSClient({
    url: url.replace('http:', 'ws:'),
    connectionParams: { pluginSurface: JSON.stringify(surface) },
    WebSocket: AppPageSocket,
  });
