import {
  formatScreenLink,
  type NavigationStreamEvent,
  type ScreenDestination,
} from '@repo/contracts/navigation';
import type { AppOpenResult } from '@repo/contracts/operations';
import type { RpcConnection } from '../rpc';
import { Queue } from './queue';

interface Receiver {
  connection: RpcConnection;
  send: (destination: ScreenDestination) => void;
}

export interface AppNavigationInput {
  serverId: string;
}

// Only the App on the Server Device's own desktop is driven from here: never a phone, a browser or a paired Device (ADR-0022).
const isLocalDesktop = (connection: RpcConnection): boolean =>
  connection.serverDevice === true &&
  connection.surface?.platform === 'desktop';

/*
 * Sends a destination to at most one live desktop App Connection on the Server Device, the one that listened most
 * recently. It never launches an App, and a delivery says nothing about whether the Screen then opened.
 */
export class AppNavigation {
  private readonly receivers = new Set<Receiver>();
  public constructor(private readonly input: AppNavigationInput) {}

  public get serverId(): string {
    return this.input.serverId;
  }

  public open(destination: ScreenDestination): AppOpenResult {
    const link = formatScreenLink(this.input.serverId, destination);
    const receiver = [...this.receivers].findLast(live);

    if (!receiver) return { status: 'not_opened', link };
    receiver.send(destination);

    return { status: 'delivered', link };
  }

  // A Connection that is not a local desktop App gets its handshake and nothing else.
  public async *requests(
    connection: RpcConnection,
    signal: AbortSignal,
  ): AsyncGenerator<NavigationStreamEvent> {
    const queue = new Queue<NavigationStreamEvent>();
    const leave = this.join(connection, queue);

    try {
      yield { type: 'ready', serverId: this.input.serverId };
      yield* queue.items(AbortSignal.any([signal, connection.signal]));
    } finally {
      leave();
    }
  }

  private join(
    connection: RpcConnection,
    queue: Queue<NavigationStreamEvent>,
  ): () => void {
    const receiver: Receiver = {
      connection,
      send: (destination) => queue.push({ type: 'open', destination }),
    };

    if (isLocalDesktop(connection)) this.receivers.add(receiver);

    return () => {
      this.receivers.delete(receiver);
    };
  }
}

const live = ({ connection }: Receiver): boolean => !connection.signal.aborted;
