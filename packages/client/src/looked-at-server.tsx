import type { QueryClient } from '@tanstack/react-query';
import {
  focusManager,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import type * as React from 'react';
import { type ReactNode, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Connection, OpenConnection } from '#features/connection';
import { ConnectionContext, holdCacheOnline } from '#features/connection';
import { TRPCProvider, useTRPC } from '#features/connection';
import type { AppServer, ServerConnections } from '#features/servers';
import { ServerScopeProvider } from '#lib/product/server-scope';
import { DeviceFeedContext } from './features/feed/api/restore-feed';
import { createQueryClient, keepServerLists } from './query-cache';
import { restoreFromDevice, writeToDevice } from './server-cache';
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
  useEffect(followsAppForeground, []);
  const looked = lookedAt(props);

  if (!looked) return null;

  return (
    <ConnectionProviders {...looked} queryClient={queryClient}>
      {props.children}
    </ConnectionProviders>
  );
}

// TanStack's React Native recipe: a phone has no tab focus, so the App's foreground state stands in for it.
function followsAppForeground(): (() => void) | undefined {
  if (Platform.OS === 'web') return undefined;

  const subscription = AppState.addEventListener('change', (state) => {
    focusManager.setFocused(state === 'active');
  });

  return (): void => {
    subscription.remove();
  };
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
  // Once, and before any cache restore: restored queries take the defaults in force when they are hydrated (#2703).
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  useState(() => keepServerLists(queryClient, trpc));

  // This Server's own cache on the Device: each kept query draws from it first, then is caught up by the Connection.
  const [retrieve] = useState(() =>
    restoreFromDevice(queryClient, trpc, { serverId: props.server.id }),
  );

  useEffect(
    () => writeToDevice(queryClient, trpc, { serverId: props.server.id }),
    [queryClient, trpc, props.server.id],
  );
  useCacheOnline(props.connection.connection);

  return (
    <DeviceFeedContext.Provider value={retrieve}>
      <ServerContexts {...props} />
    </DeviceFeedContext.Provider>
  );
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
