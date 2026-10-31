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
  // After this the listener never binds again, so a change racing the Server's close cannot reopen the port.
  readonly stop: () => void;
}

const addressFor = (network: boolean): string =>
  network ? networkAddress : loopbackAddress;

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

export const isLoopback = (address: string | undefined): boolean =>
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
    stop: (): void => listener.stop(),
  };
}

class NetworkListener {
  private address: string;
  private stopped = false;
  private readonly dropNetworkConnections: () => void;

  public constructor(
    private readonly server: Server,
    private readonly port: number,
    network: boolean,
  ) {
    this.address = addressFor(network);
    this.dropNetworkConnections = trackConnections(server);
  }

  public start(): Promise<void> {
    return listenAt(this.server, this.port, this.address);
  }

  public where(): string {
    return `${this.address}:${this.port}`;
  }

  public stop(): void {
    this.stopped = true;
  }

  public async rebind(network: boolean): Promise<void> {
    const target = addressFor(network);

    if (!this.movesTo(target)) return;
    /*
     * Stops accepting at once and leaves the Connections already open alone.
     * close(), the listen in moveTo and its error callback all run in this tick, so stop() cannot land between the check above and the bind. If listen ever became asynchronous, check `stopped` again here.
     */
    this.server.close();
    await this.moveTo(target);

    if (!network) this.dropNetworkConnections();
  }

  // A listener that lost both addresses (see moveTo) is moved even when it is asked for the one it names.
  private movesTo(target: string): boolean {
    if (this.stopped) throw new Error('The Server is closing');

    return target !== this.address || !this.server.listening;
  }

  // A listener that cannot move goes back to where it was and reports why it could not; if it cannot go back either, the error carries both.
  private async moveTo(target: string): Promise<void> {
    try {
      await listenAt(this.server, this.port, target);
      this.address = target;
    } catch (error) {
      const moveError =
        error instanceof Error ? error : new Error(String(error));

      await this.listenAgain(moveError);
      throw moveError;
    }
  }

  private async listenAgain(moveError: Error): Promise<void> {
    try {
      await listenAt(this.server, this.port, this.address);
    } catch (backError) {
      throw new AggregateError(
        [moveError, backError],
        'The Server could not move its listener or go back',
      );
    }
  }
}
