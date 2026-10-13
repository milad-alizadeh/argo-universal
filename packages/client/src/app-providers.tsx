import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';
import { type ReactNode, useMemo, useState, useSyncExternalStore } from 'react';
import { initializeLoginOwner } from '#features/agents';
import { ConnectionContext } from '#features/connection';
import { openConnection } from '#features/connection';
import { BlobUrlContext, createServerBlobUrl } from '#features/connection';
import { TRPCProvider } from '#features/connection';

initializeLoginOwner();

export interface AppProvidersProps {
  serverUrl: string;
  children: ReactNode;
}

type Connection = ReturnType<typeof openConnection>;

// One QueryClient and one Connection for the App's lifetime; give it a new key to switch Servers.
export function AppProviders(
  props: AppProvidersProps,
): React.JSX.Element | null {
  const [queryClient] = useState(() => new QueryClient());
  const connection = useConnection(props.serverUrl, queryClient);
  if (!connection) return null;
  return (
    <ConnectionProviders
      {...props}
      queryClient={queryClient}
      connection={connection}
    />
  );
}

interface ServerProvidersProps extends AppProvidersProps {
  connection: Connection;
}

interface ConnectionProvidersProps extends ServerProvidersProps {
  queryClient: QueryClient;
}

function ConnectionProviders({
  queryClient,
  ...props
}: ConnectionProvidersProps): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider
        trpcClient={props.connection.client}
        queryClient={queryClient}
      >
        <ServerProviders {...props} />
      </TRPCProvider>
    </QueryClientProvider>
  );
}

function ServerProviders({
  serverUrl,
  connection,
  children,
}: ServerProvidersProps): React.JSX.Element {
  const blobUrl = useMemo(() => createServerBlobUrl(serverUrl), [serverUrl]);
  return (
    <ConnectionContext.Provider value={connection.connection}>
      <BlobUrlContext.Provider value={blobUrl}>
        {children}
      </BlobUrlContext.Provider>
    </ConnectionContext.Provider>
  );
}

function emptyConnection(): null {
  return null;
}

function useConnection(
  serverUrl: string,
  queryClient: QueryClient,
): Connection | null {
  const store = useMemo(
    () => new ConnectionStore(serverUrl, queryClient),
    [serverUrl, queryClient],
  );
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    emptyConnection,
  );
}

class ConnectionStore {
  private opened: Connection | null = null;
  private readonly serverUrl: string;
  private readonly queryClient: QueryClient;

  public constructor(serverUrl: string, queryClient: QueryClient) {
    this.serverUrl = serverUrl;
    this.queryClient = queryClient;
  }

  public readonly getSnapshot = (): Connection | null => this.opened;

  public readonly subscribe = (changed: () => void): (() => void) => {
    const connection = openConnection(this.serverUrl, this.queryClient);
    this.opened = connection;
    changed();
    return () => this.close(connection);
  };

  private close(connection: Connection): void {
    this.opened = null;
    void connection.close();
  }
}
