import type { PluginSurface } from '@repo/contracts/plugins/kit';
import { createWSClient } from '@trpc/client';
import { onTestFinished } from 'vitest';

export const pluginSocket = (
  url: string,
  surface: Partial<PluginSurface>,
): ReturnType<typeof createWSClient> =>
  createWSClient({
    url: url.replace('http:', 'ws:'),
    connectionParams: { pluginSurface: JSON.stringify(surface) },
  });

export const closePluginSubscription = (
  socket: ReturnType<typeof createWSClient>,
  subscription: { unsubscribe: () => void },
): (() => void) => {
  onTestFinished(async () => {
    subscription.unsubscribe();
    await socket.close();
  });

  return (): void => subscription.unsubscribe();
};
