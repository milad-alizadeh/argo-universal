import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { openConnection } from '#features/connection';
import {
  type AppServer,
  type AppServerState,
  serverStateOf,
} from './app-server';
import {
  noConnections,
  openServerConnections,
  type ServerConnections,
} from './open-server-connections';

export type { ServerConnections } from './open-server-connections';

/*
 * The App's Connection to each Server it holds one for (ADR-0022). They open together and close together, so a list
 * that changes reopens them all; it changes when a Device pairs or unpairs, not while the App is read.
 */
class ServerConnectionsStore {
  private connections: ServerConnections = noConnections;
  private readonly servers: readonly AppServer[];

  public constructor(servers: readonly AppServer[]) {
    this.servers = servers;
  }

  public readonly getSnapshot = (): ServerConnections => this.connections;

  public readonly subscribe = (changed: () => void): (() => void) => {
    const connections = openServerConnections(this.servers, openConnection);
    this.connections = connections;
    changed();

    return () => this.close(connections);
  };

  private close(connections: ServerConnections): void {
    this.connections = noConnections;

    for (const connection of connections.values()) void connection.close();
  }
}

/*
 * One Connection per Server, held for as long as the App holds that list. The list must be one array per list rather
 * than a new one on each render, or every Connection would close and open again.
 */
export function useServerConnections(
  servers: readonly AppServer[],
): ServerConnections {
  const store = useMemo(() => new ServerConnectionsStore(servers), [servers]);

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    emptyConnections,
  );
}

const emptyConnections = (): ServerConnections => noConnections;

export const ServerConnectionsContext =
  createContext<ServerConnections>(noConnections);

type ServerStates = ReadonlyMap<string, AppServerState>;

const statesOf = (connections: ServerConnections): ServerStates =>
  new Map(
    [...connections].map(([id, open]) => [
      id,
      serverStateOf(open.connection.state()),
    ]),
  );

// Each Server's own state, read from its own Connection, so one unreachable Server says nothing about the next.
class ServerStatesStore {
  private states: ServerStates;
  private readonly connections: ServerConnections;

  public constructor(connections: ServerConnections) {
    this.connections = connections;
    this.states = statesOf(connections);
  }

  public readonly getSnapshot = (): ServerStates => this.states;

  public readonly subscribe = (changed: () => void): (() => void) => {
    const stops = [...this.connections.values()].map((open) =>
      open.connection.subscribe(() => {
        this.states = statesOf(this.connections);
        changed();
      }),
    );

    return () => {
      for (const stop of stops) stop();
    };
  };
}

/*
 * Every Server's state for the list: a Server with no Connection — none has been opened for it, because this Device
 * has no address for it — is absent, which reads as unreachable.
 */
export function useAppServerStates(): ServerStates {
  const connections = useContext(ServerConnectionsContext);

  const store = useMemo(
    () => new ServerStatesStore(connections),
    [connections],
  );

  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
