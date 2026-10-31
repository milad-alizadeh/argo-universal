import type { Server } from 'node:http';
import type { Socket } from 'node:net';

const loopbackAddress = '127.0.0.1';

// Every interface of this computer, so another Device on the local network can reach the Server.
const networkAddress = '0.0.0.0';

export interface ServerListener {
  // Where the Server is listening now, as `address:port`.
  readonly where: () => string;
  // Moves to the local network (true) or back to loopback (false) without closing the Server. Back to loopback drops every Connection that came in from the network.
  readonly rebind: (network: boolean) => Promise<void>;
}

const listenAt = (
  server: Server,
  port: number,
  address: string,
): Promise<void> =>
  new Promise<void>((resolve, reject): void => {
    server.once('error', reject);
    server.listen(port, address, (): void => {
      server.off('error', reject);
      resolve();
    });
  });

const loopbackPattern = /^(::1|(::ffff:)?127\.)/;

const isLoopback = (address: string | undefined): boolean =>
  loopbackPattern.test(address ?? '');

// Keeps the open sockets, upgraded WebSockets included, so a narrower bind can drop the ones that came from the network.
function trackConnections(server: Server): () => void {
  const open = new Set<Socket>();

  server.on('connection', (socket): void => {
    open.add(socket);
    socket.once('close', (): void => {
      open.delete(socket);
    });
  });

  return (): void => {
    for (const socket of open)
      if (!isLoopback(socket.remoteAddress)) socket.destroy();
  };
}

// ADR 0002, amended by ADR 0045: loopback until the owner turns on Local network access.
export async function listenForNetworkAccess(
  server: Server,
  port: number,
  network: boolean,
): Promise<ServerListener> {
  const listener = new NetworkListener(server, port, network);
  await listener.start();

  return {
    where: (): string => listener.where(),
    rebind: (next): Promise<void> => listener.rebind(next),
  };
}

class NetworkListener {
  private address: string;
  private readonly dropNetworkConnections: () => void;

  public constructor(
    private readonly server: Server,
    private readonly port: number,
    network: boolean,
  ) {
    this.address = network ? networkAddress : loopbackAddress;
    this.dropNetworkConnections = trackConnections(server);
  }

  public start(): Promise<void> {
    return listenAt(this.server, this.port, this.address);
  }

  public where(): string {
    return `${this.address}:${this.port}`;
  }

  public async rebind(network: boolean): Promise<void> {
    const target = network ? networkAddress : loopbackAddress;

    if (target === this.address) return;
    // Stops accepting at once and leaves the Connections already open alone.
    this.server.close();
    await this.moveTo(target);
    this.settle(network);
  }

  private settle(network: boolean): void {
    if (!network) this.dropNetworkConnections();
  }

  // A listener that cannot move stays where it was, so a failed switch never leaves the Server unreachable.
  private async moveTo(target: string): Promise<void> {
    try {
      await listenAt(this.server, this.port, target);
      this.address = target;
    } catch (error) {
      await listenAt(this.server, this.port, this.address);
      throw error;
    }
  }
}
