import type {
  Connection,
  OpenConnection,
  ServerEndpoint,
} from '#features/connection';
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
  endpoint: ServerEndpoint,
) => Held;

/*
 * Where the App opens a Connection, by Server id (ADR-0022). A Server with no address yet gets none: there is nowhere
 * to open one, and its row reads unreachable, which is what the owner needs to read.
 */
export function connectableServers(
  servers: readonly AppServer[],
): ReadonlyMap<string, ServerEndpoint> {
  const endpoints = new Map<string, ServerEndpoint>();

  for (const server of servers) keepFirstEndpoint(endpoints, server);

  return endpoints;
}

// Two endpoints with the same key are the same place, so a Server that has not moved keeps the Connection it has.
export const endpointKey = (endpoint: ServerEndpoint): string =>
  'serverPublicKey' in endpoint
    ? `channel://${endpoint.host}:${endpoint.port}#${endpoint.serverPublicKey}`
    : endpoint.url;

// Where a Server answers: the loopback address of the one on this Device, or the channel of one it paired with.
export const endpointOf = ({
  url,
  channel,
}: AppServer): ServerEndpoint | undefined =>
  channel ?? (url === undefined ? undefined : { url });

// A Server kept twice keeps its first entry, so the second never shadows a Connection the App would then never close.
const keepFirstEndpoint = (
  endpoints: Map<string, ServerEndpoint>,
  server: AppServer,
): void => {
  const endpoint = endpointOf(server);

  if (endpoint === undefined || endpoints.has(server.id)) return;

  endpoints.set(server.id, endpoint);
};
