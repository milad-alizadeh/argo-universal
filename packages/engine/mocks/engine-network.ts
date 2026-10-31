import { Server } from 'node:http';
import { networkInterfaces } from 'node:os';
import {
  type DiscoveredServer,
  discoveryKeyField,
  discoveryProtocol,
  discoveryServiceType,
} from '@repo/contracts';
import { Bonjour, type Service } from 'bonjour-service';
import { vi } from 'vitest';
import { WebSocket } from 'ws';

// An address of this computer on the local network, the way another Device would reach it; undefined when it is offline.
export const lanAddress = Object.values(networkInterfaces())
  .flat()
  .find((entry) => entry?.family === 'IPv4' && !entry.internal)?.address;

// Opens a real WebSocket to the Server at `host`; rejects when nothing answers or the upgrade is refused.
export function connect(
  host: string | undefined,
  port: number,
  headers: Record<string, string> = {},
): Promise<WebSocket> {
  return new Promise<WebSocket>((resolve, reject): void => {
    const socket = new WebSocket(`ws://${host}:${port}`, { headers });
    socket.once('open', (): void => resolve(keepQuiet(socket)));

    socket.once('unexpected-response', (_request, response): void => {
      response.resume();
      reject(new Error(`upgrade refused: ${response.statusCode}`));
    });

    socket.once('error', reject);
  });
}

// A Server that drops this Connection resets it; a test reads that as the socket closing, not as a failure.
function keepQuiet(socket: WebSocket): WebSocket {
  socket.on('error', (): void => undefined);

  return socket;
}

export async function reachable(
  host: string | undefined,
  port: number,
): Promise<boolean> {
  const socket = await connect(host, port).catch((): null => null);
  socket?.close();

  return socket !== null;
}

// The HTTP status of the upgrade: 101 when it opens, 0 when nothing answers.
export async function upgradeStatus(
  host: string | undefined,
  port: number,
  headers: Record<string, string> = {},
): Promise<number> {
  const opened = await connect(host, port, headers).then(
    (socket) => socket,
    (error: Error) => error,
  );

  if (opened instanceof Error) return refusalStatus(opened);
  opened.close();

  return 101;
}

const refusalStatus = (error: Error): number =>
  Number(/upgrade refused: (\d+)/.exec(error.message)?.[1] ?? 0);

// Makes the next `times` binds of `target` fail the way a taken port does; later binds work. `vi.restoreAllMocks` undoes it.
export function refuseBinds(target: Server, times = 1): void {
  const listen = vi.spyOn(target, 'listen');

  for (let refused = 0; refused < times; refused++)
    listen.mockImplementationOnce(takenPort);
}

function takenPort(this: Server, ...args: unknown[]): Server {
  queueMicrotask((): void => {
    const error = new Error(`${String(args[1])} is in use`);
    this.emit('error', Object.assign(error, { code: 'EADDRINUSE' }));
  });

  return this;
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
