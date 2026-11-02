import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import type * as React from 'react';
import { type ReactNode, useEffect, useState } from 'react';
import type { Connection, OpenConnection } from '#features/connection';
import { ConnectionContext, holdCacheOnline } from '#features/connection';
import { TRPCProvider } from '#features/connection';
import type { AppServer, ServerConnections } from '#features/servers';
import { ServerScopeProvider } from '#lib/product/server-scope';
import { createQueryClient } from './query-cache';
import { ServerUrls } from './server-urls';

export interface LookedAtServerProps {
  servers: readonly AppServer[];
  lookingAt: string;
  connections: ServerConnections;
  children: ReactNode;
}

/*
 * The Sessions, Projects and Feed of the one Server the App is looking at, read over that Server's own Connection.
 * Nothing is drawn until that Connection is open for the screens to read through.
 */
export function LookedAtServer(
  props: LookedAtServerProps,
): React.JSX.Element | null {
  const [queryClient] = useState(createQueryClient);
  const looked = lookedAt(props);

  if (!looked) return null;

  return (
    <ConnectionProviders {...looked} queryClient={queryClient}>
      {props.children}
    </ConnectionProviders>
  );
}

// A Server with somewhere to open a Connection, and the Connection opened to it.
interface LookedAtConnection {
  server: AppServer;
  connection: OpenConnection;
}

function lookedAt(props: LookedAtServerProps): LookedAtConnection | undefined {
  const server = props.servers.find(({ id }) => id === props.lookingAt);

  const connection = props.connections.get(props.lookingAt);

  return server && connection ? { server, connection } : undefined;
}

interface ServerProvidersProps extends LookedAtConnection {
  children: ReactNode;
}

interface ConnectionProvidersProps extends ServerProvidersProps {
  queryClient: QueryClient;
}

// Only this Server drives the cache's online flag, so another Server being unreachable never pauses these queries.
const useCacheOnline = (connection: Connection): void => {
  useEffect(() => holdCacheOnline(connection), [connection]);
};

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

function ServerProviders(props: ServerProvidersProps): React.JSX.Element {
  useCacheOnline(props.connection.connection);

  return <ServerContexts {...props} />;
}

function ServerContexts({
  server,
  connection: { connection, fetch },
  children,
}: ServerProvidersProps): React.JSX.Element {
  return (
    <ServerScopeProvider server={server}>
      <ConnectionContext.Provider value={connection}>
        <ServerUrls server={server} read={fetch}>
          {children}
        </ServerUrls>
      </ConnectionContext.Provider>
    </ServerScopeProvider>
  );
}
