import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';
import { type ReactNode, useMemo, useState, useSyncExternalStore } from 'react';
import { ConnectionContext } from '#features/connection';
import { openConnection } from '#features/connection';
import {
  BlobUrlContext,
  createServerBlobUrl,
  createServerMediaUrl,
} from '#features/connection';
import { TRPCProvider } from '#features/connection';
import { MediaUrlContext } from '#primitives/content/media-url';

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
  const connection = useServerConnection(props.serverUrl);

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
  return (
    <ConnectionContext.Provider value={connection.connection}>
      <ServerUrls serverUrl={serverUrl}>{children}</ServerUrls>
    </ConnectionContext.Provider>
  );
}

type ServerUrlsProps = { serverUrl: string; children: ReactNode };

// Images and Plugin media load over HTTP from the Server's own routes.
function ServerUrls({
  serverUrl,
  children,
}: ServerUrlsProps): React.JSX.Element {
  const blobUrl = useMemo(() => createServerBlobUrl(serverUrl), [serverUrl]);
  const mediaUrl = useMemo(() => createServerMediaUrl(serverUrl), [serverUrl]);

  return (
    <BlobUrlContext.Provider value={blobUrl}>
      <MediaUrlContext.Provider value={mediaUrl}>
        {children}
      </MediaUrlContext.Provider>
    </BlobUrlContext.Provider>
  );
}

function emptyConnection(): null {
  return null;
}

function useServerConnection(serverUrl: string): Connection | null {
  const store = useMemo(() => new ConnectionStore(serverUrl), [serverUrl]);

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    emptyConnection,
  );
}

class ConnectionStore {
  private opened: Connection | null = null;
  private readonly serverUrl: string;

  public constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  public readonly getSnapshot = (): Connection | null => this.opened;

  public readonly subscribe = (changed: () => void): (() => void) => {
    const connection = openConnection(this.serverUrl);
    this.opened = connection;
    changed();

    return () => this.close(connection);
  };

  private close(connection: Connection): void {
    this.opened = null;
    void connection.close();
  }
}
