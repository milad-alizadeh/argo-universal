import type { DiscoveredServer } from '@repo/contracts';

// Starts listening for Argo Servers on the local network and reports every one heard so far each time that changes; answers a function that stops. The platform supplies it: mDNS on a phone, a browser of its own on a desktop.
export type BrowseServers = (
  listener: (servers: readonly DiscoveredServer[]) => void,
) => () => void;

export interface ServerAddress {
  host: string;
  port: number;
}

// What the App keeps of a Server it has paired with. The key is the anchor: a rename, a new router or a new IP address change everything else. The name is for the list, and the address only a fallback for when nothing answers.
export interface KnownServer {
  name: string;
  key: string;
  address?: ServerAddress;
}

export interface ServerLocation {
  // The name the Server announces now; the App keeps this one.
  name: string;
  // Addresses to try, in order.
  hosts: string[];
  port: number;
  source: 'discovery' | 'address';
}

const defaultTimeoutMs = 3000;

export class ServerNotFoundError extends Error {
  public constructor(name: string) {
    super(`${name} is not on the local network`);
    this.name = 'ServerNotFoundError';
  }
}

const release =
  (timer: ReturnType<typeof setTimeout>, stop: () => void) => (): void => {
    clearTimeout(timer);
    stop();
  };

const nothingToStop = (): void => undefined;

type Heard = PromiseWithResolvers<DiscoveredServer | null>;

// Listens for the Server with this key. Where nothing can listen, or the browser cannot start (a native module that is not linked), nothing is awaited and the stored address answers.
function startBrowsing(
  browse: BrowseServers | null,
  key: string,
  heard: Heard,
): () => void {
  try {
    return browse ? listen(browse, key, heard) : giveUp(heard);
  } catch {
    return giveUp(heard);
  }
}

const listen = (
  browse: BrowseServers,
  key: string,
  heard: Heard,
): (() => void) =>
  browse((servers): void => {
    const found = servers.find((server) => server.key === key);

    if (found) heard.resolve(found);
  });

function giveUp(heard: Heard): () => void {
  heard.resolve(null);

  return nothingToStop;
}

// Waits for the Server with this key to announce itself, or gives up. A computer that answers to the right name with another key is not the Server.
function waitForAnnouncement(
  browse: BrowseServers | null,
  key: string,
  timeoutMs: number,
): Promise<DiscoveredServer | null> {
  const heard = Promise.withResolvers<DiscoveredServer | null>();
  const stop = startBrowsing(browse, key, heard);
  const timer = setTimeout((): void => heard.resolve(null), timeoutMs);

  return heard.promise.finally(release(timer, stop));
}

const announced = (found: DiscoveredServer): ServerLocation => ({
  name: found.name,
  hosts: found.addresses,
  port: found.port,
  source: 'discovery',
});

function remembered(known: KnownServer): ServerLocation {
  if (!known.address) throw new ServerNotFoundError(known.name);

  return {
    name: known.name,
    hosts: [known.address.host],
    port: known.address.port,
    source: 'address',
  };
}

/*
 * Where the Server is now, asked of the network on every connect and never taken from the last connect (ADR-0045).
 * The announcement is matched by key, so a renamed computer is still found; the stored address answers only when nothing announces itself.
 * Which of the addresses is the Server is for the handshake to prove, not this.
 */
export async function resolveServer(
  known: KnownServer,
  browse: BrowseServers | null,
  timeoutMs: number = defaultTimeoutMs,
): Promise<ServerLocation> {
  const found = await waitForAnnouncement(browse, known.key, timeoutMs);

  return found ? announced(found) : remembered(known);
}
