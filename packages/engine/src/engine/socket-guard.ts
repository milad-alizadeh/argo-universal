import type { Socket } from 'node:net';
import { isLoopback } from './network-listener';

export interface SocketGuardOptions {
  readonly report: (subject: string, value: string | undefined) => void;
  // How long a socket may take to prove what it is before the Server closes it.
  readonly timeoutMs?: number;
  // How many sockets of one kind may be waiting to prove it at once.
  readonly most?: number;
}

const defaultTimeoutMs = 10_000;

const defaultMost = 64;

type Kind = 'loopback' | 'network';

/*
 * Holds the sockets that have connected and not yet shown what they are: the bytes that tell a channel from plain HTTP, and the whole of the handshake's first message (ADR-0045).
 * Nothing about such a socket is authenticated, so anything that can reach the port can open one and say nothing, and without a limit it would hold the Server's sockets for as long as it liked. Each one gets a time to finish, and each kind gets a number it may not exceed.
 * Loopback and the network count separately, so a flood from the network cannot keep this computer's own App out.
 */
export class SocketGuard {
  private readonly waiting: Record<Kind, number> = { loopback: 0, network: 0 };
  private readonly timeoutMs: number;
  private readonly most: number;

  public constructor(private readonly options: SocketGuardOptions) {
    this.timeoutMs = options.timeoutMs ?? defaultTimeoutMs;
    this.most = options.most ?? defaultMost;
  }

  /*
   * Starts the clock on a socket and answers the function to call once it has shown what it is, which stops the clock. A socket that arrives over the limit is closed and gets none.
   */
  public hold(socket: Socket): (() => void) | undefined {
    const kind: Kind = isLoopback(socket.remoteAddress)
      ? 'loopback'
      : 'network';

    if (this.waiting[kind] >= this.most) return this.turnAway(socket);
    this.waiting[kind] += 1;
    socket.setTimeout(this.timeoutMs, (): void => this.expire(socket));

    return this.releaser(socket, kind);
  }

  private releaser(socket: Socket, kind: Kind): () => void {
    let held = true;

    const release = (): void => {
      if (!held) return;
      held = false;
      this.waiting[kind] -= 1;
      socket.setTimeout(0);
    };

    socket.once('close', release);

    return release;
  }

  private expire(socket: Socket): void {
    this.options.report('Connection that stalled', socket.remoteAddress);
    socket.destroy();
  }

  private turnAway(socket: Socket): undefined {
    this.options.report('Connection over the limit', socket.remoteAddress);
    socket.destroy();

    return undefined;
  }
}
