import { QueryClient } from '@tanstack/react-query';
import { createWSClient } from '@trpc/client';
import type { ConnectionInput } from '../src/features/connection/state/machine';

// Lazy clients never open a socket while the test replaces the Connection watcher.
export const createConnectionInput = (): ConnectionInput => ({
  webSocketClient: createWSClient({
    url: 'ws://127.0.0.1:7337',
    lazy: { enabled: true, closeMs: 0 },
  }),
  queryClient: new QueryClient(),
});
