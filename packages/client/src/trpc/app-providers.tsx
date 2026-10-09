import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';
import { type ReactNode, useMemo, useState, useSyncExternalStore } from 'react';
import { ConnectionContext } from '../connection/context';
import { openConnection } from '../connection/open-connection';
import { BlobUrlContext, createServerBlobUrl } from './blob-url';
import { TRPCProvider } from './context';

export interface AppProvidersProps {
  serverUrl: string;
  children: ReactNode;
}

type Connection = ReturnType<typeof openConnection>;

// One QueryClient and one Connection for the App's lifetime; give it a new key to switch Servers.
export function AppProviders({
  serverUrl,
  children,
}: AppProvidersProps): React.JSX.Element | null {
  const [queryClient] = useState(() => new QueryClient());
  const connectionStore = useMemo(
    () => connectionSubscription(serverUrl, queryClient),
    [serverUrl, queryClient],
  );
  const connection = useSyncExternalStore(
    connectionStore.subscribe,
    connectionStore.getSnapshot,
    emptyConnection,
  );
  const blobUrl = useMemo(() => createServerBlobUrl(serverUrl), [serverUrl]);

  if (!connection) return null;
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={connection.client} queryClient={queryClient}>
        <ConnectionContext.Provider value={connection.connection}>
          <BlobUrlContext.Provider value={blobUrl}>
            {children}
          </BlobUrlContext.Provider>
        </ConnectionContext.Provider>
      </TRPCProvider>
    </QueryClientProvider>
  );
}

function emptyConnection(): null {
  return null;
}

function connectionSubscription(
  serverUrl: string,
  queryClient: QueryClient,
): {
  subscribe: (changed: () => void) => () => void;
  getSnapshot: () => Connection | null;
} {
  let opened: Connection | null = null;
  return {
    getSnapshot: () => opened,
    subscribe: (changed) => {
      const connection = openConnection(serverUrl, queryClient);
      opened = connection;
      changed();
      return () => {
        opened = null;
        void connection.close();
      };
    },
  };
}
