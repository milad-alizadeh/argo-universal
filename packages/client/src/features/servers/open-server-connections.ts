import type { OpenConnection } from '#features/connection';
import type { AppServer } from './app-server';

export type ServerConnections = ReadonlyMap<string, OpenConnection>;

export const noConnections: ServerConnections = new Map();

// Opens the App's Connection to one Server; `openConnection` is the only one, and a test gives its own Servers.
export type OpenServerConnection = (serverUrl: string) => OpenConnection;

/*
 * One Connection per Server (ADR-0022), opened together. A Server with no address yet gets none: there is nowhere to
 * open one, and its row reads unreachable, which is what the owner needs to read.
 */
export function openServerConnections(
  servers: readonly AppServer[],
  open: OpenServerConnection,
): ServerConnections {
  const connections = new Map<string, OpenConnection>();

  for (const { id, url } of servers)
    if (url !== undefined) connections.set(id, open(url));

  return connections;
}
