import { networkInterfaces } from 'node:os';
import {
  type DiscoveredServer,
  discoveryKeyField,
  discoveryProtocol,
  discoveryServiceType,
} from '@repo/contracts';
import { Bonjour, type Service } from 'bonjour-service';
import { WebSocket } from 'ws';

// An address of this computer on the local network, the way another Device would reach it; undefined when it is offline.
export const lanAddress = Object.values(networkInterfaces())
  .flat()
  .find((entry) => entry?.family === 'IPv4' && !entry.internal)?.address;

// Opens a real WebSocket to the Server at `host`; rejects when nothing answers or the upgrade is refused.
export function connect(
  host: string | undefined,
  port: number,
): Promise<WebSocket> {
  return new Promise<WebSocket>((resolve, reject): void => {
    const socket = new WebSocket(`ws://${host}:${port}`);
    socket.once('open', (): void => resolve(socket));

    socket.once('unexpected-response', (_request, response): void => {
      response.resume();
      reject(new Error(`upgrade refused: ${response.statusCode}`));
    });

    socket.once('error', reject);
  });
}

export async function reachable(
  host: string | undefined,
  port: number,
): Promise<boolean> {
  const socket = await connect(host, port).catch((): null => null);
  socket?.close();

  return socket !== null;
}

export const closed = (socket: WebSocket): Promise<void> =>
  new Promise<void>((resolve): void => {
    socket.once('close', (): void => resolve());
  });

const isAddress = (address: string): boolean =>
  /^\d+\.\d+\.\d+\.\d+$/.test(address);

const keyOf = (service: Service): string =>
  String(service.txt?.[discoveryKeyField] ?? '');

function toServer(service: Service): DiscoveredServer | undefined {
  const key = keyOf(service);

  return key
    ? {
        name: service.name,
        key,
        addresses: (service.addresses ?? []).filter(isAddress),
        port: service.port,
      }
    : undefined;
}

type Listener = (servers: readonly DiscoveredServer[]) => void;

// Every Argo Server heard so far, by the name of its announcement; one that says goodbye is dropped.
class Heard {
  private readonly servers = new Map<string, DiscoveredServer>();

  public constructor(private readonly listener: Listener) {}

  public up(service: Service): void {
    const server = toServer(service);

    if (server) this.servers.set(service.fqdn, server);
    this.listener([...this.servers.values()]);
  }

  public down(service: Service): void {
    this.servers.delete(service.fqdn);
    this.listener([...this.servers.values()]);
  }
}

// Another Device's mDNS browser, as an App on the same network runs one: told no address, it reports every Argo Server it hears.
export function watchAnnouncedServers(listener: Listener): () => void {
  const bonjour = new Bonjour();
  const heard = new Heard(listener);
  const browser = bonjour.find({
    type: discoveryServiceType,
    protocol: discoveryProtocol,
  });

  browser.on('up', (service: Service): void => heard.up(service));
  browser.on('down', (service: Service): void => heard.down(service));

  return (): void => {
    browser.stop();
    bonjour.destroy();
  };
}
