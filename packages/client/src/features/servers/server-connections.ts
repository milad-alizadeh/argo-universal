import { createContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { openConnection } from '#features/connection';
import type { AppServer } from './app-server';
import {
  noConnections,
  type OpenServerConnection,
  type ServerConnections,
} from './open-server-connections';
import { ServerConnectionsStore } from './server-connections-store';

export type {
  OpenServerConnection,
  ServerConnections,
} from './open-server-connections';

/*
 * One Connection per Server, held for as long as the App is mounted. The list is held again whenever it changes —
 * this Device's kept Servers arriving at startup, or the own Server moving — and only what is new opens, so the
 * Connections already open are never closed and opened again and the tree reading through them is never torn down.
 * A Server paired while the App is running appears once the kept list is read again, which #1496 owns.
 */
export function useServerConnections(
  servers: readonly AppServer[],
  open: OpenServerConnection = openConnection,
): ServerConnections {
  const store = useMemo(() => new ServerConnectionsStore(open), [open]);

  const connections = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  useEffect(() => store.hold(servers), [store, servers]);
  useEffect(() => (): void => store.closeAll(), [store]);

  return connections;
}

export const ServerConnectionsContext =
  createContext<ServerConnections>(noConnections);
