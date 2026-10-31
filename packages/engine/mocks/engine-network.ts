import { Server } from 'node:http';
import { networkInterfaces } from 'node:os';
import {
  type DiscoveredServer,
  type Announced,
  HeardServers,
  discoveryProtocol,
  discoveryServiceType,
} from '@repo/contracts';
import { Bonjour, type Browser, type Service } from 'bonjour-service';
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

const asAnnounced = (service: Service): Announced => ({
  name: service.name,
  txt: service.txt,
  addresses: service.addresses ?? [],
  port: service.port,
});

const browseArgo = (bonjour: Bonjour): Browser =>
  bonjour.find({ type: discoveryServiceType, protocol: discoveryProtocol });

// Another Device's mDNS browser, as an App on the same network runs one: told no address, it reports every Argo Server it hears.
export function watchAnnouncedServers(
  listener: (servers: readonly DiscoveredServer[]) => void,
): () => void {
  const bonjour = new Bonjour();
  const heard = new HeardServers(listener);
  const browser = browseArgo(bonjour);

  browser.on('up', (service: Service): void =>
    heard.up(service.fqdn, asAnnounced(service)),
  );
  browser.on('down', (service: Service): void => heard.down(service.fqdn));

  return (): void => {
    browser.stop();
    bonjour.destroy();
  };
}

// Every address this computer has, on any interface.
export const ownAddresses = Object.values(networkInterfaces())
  .flat()
  .flatMap((entry) => (entry ? [entry.address] : []));
