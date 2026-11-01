import type * as React from 'react';
import { type ReactNode, useMemo, useSyncExternalStore } from 'react';
import {
  createServersStore,
  type OpenServerConnection,
  type ServerConnections,
  ServerConnectionsContext,
  ServersContext,
  type ServersSnapshot,
  type ServersStore,
  useServerConnections,
} from '#features/servers';
import { LookedAtServer } from './looked-at-server';

export interface AppProvidersProps {
  // The Server on this Device: the one the App opens on, and the only one on a Device that has paired with none.
  serverUrl: string;
  // How a Connection to a Server is opened; a story stands in for the network here.
  openServer?: OpenServerConnection;
  children: ReactNode;
}

/*
 * The App's Servers: a Connection to each one it holds (ADR-0022), and the Sessions, Projects and Feed of the one it
 * is looking at.
 */
export function AppProviders(props: AppProvidersProps): React.JSX.Element {
  const store = useMemo(
    () => createServersStore(props.serverUrl),
    [props.serverUrl],
  );

  return (
    <AppServers store={store} openServer={props.openServer}>
      {props.children}
    </AppServers>
  );
}

const useServers = (store: ServersStore): ServersSnapshot =>
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

interface AppServersProps {
  store: ServersStore;
  openServer?: OpenServerConnection;
  children: ReactNode;
}

// Every Server the App holds, each with its own Connection, and the one it is looking at.
function AppServers({ store, ...props }: AppServersProps): React.JSX.Element {
  const servers = useServers(store);
  const connections = useServerConnections(servers.servers, props.openServer);

  return (
    <ServersContext.Provider
      value={{ ...servers, look: store.look, add: store.add }}
    >
      <ServerConnectionsContext.Provider value={connections}>
        {servers.read
          ? lookedAtServer({ servers, connections, ...props })
          : null}
      </ServerConnectionsContext.Provider>
    </ServersContext.Provider>
  );
}

interface LookedAtProps {
  servers: ServersSnapshot;
  connections: ServerConnections;
  children: ReactNode;
}

/*
 * Looking at another Server starts its screens again on a QueryClient of its own — a new key, so a new client — and
 * no answer from one Server is ever shown for another; the Connections themselves stay open either way. Nothing is
 * drawn until the kept list has been read, so the App opens on the Server it was last looking at rather than showing
 * its own Server's Sessions and moving off them.
 */
const lookedAtServer = ({
  servers,
  connections,
  children,
}: LookedAtProps): React.JSX.Element => (
  <LookedAtServer
    key={servers.lookingAt}
    {...servers}
    connections={connections}
  >
    {children}
  </LookedAtServer>
);
