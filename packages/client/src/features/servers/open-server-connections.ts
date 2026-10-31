import type { Connection, OpenConnection } from '#features/connection';
import type { AppServer } from './app-server';

/*
 * What the App holds for one Server: the Connection its screens read through, and how to close it. Only these two are
 * the store's business, so a test can hold Servers of its own without a Server to open a WebSocket to.
 */
export interface HeldServer {
  connection: Connection;
  close: () => Promise<void>;
}

export type ServerConnections = ReadonlyMap<string, OpenConnection>;

export const noConnections: ServerConnections = new Map();

// Opens the App's Connection to one Server; `openConnection` is the only one in the App, and a test gives its own.
export type OpenServerConnection<Held extends HeldServer = OpenConnection> = (
  serverUrl: string,
) => Held;

/*
 * Where the App opens a Connection, by Server id (ADR-0022). A Server with no address yet gets none: there is nowhere
 * to open one, and its row reads unreachable, which is what the owner needs to read.
 */
export function connectableServers(
  servers: readonly AppServer[],
): ReadonlyMap<string, string> {
  const urls = new Map<string, string>();

  for (const server of servers) keepFirstUrl(urls, server);

  return urls;
}

// A Server kept twice keeps its first entry, so the second never shadows a Connection the App would then never close.
const keepFirstUrl = (
  urls: Map<string, string>,
  { id, url }: AppServer,
): void => {
  if (url === undefined || urls.has(id)) return;

  urls.set(id, url);
};
