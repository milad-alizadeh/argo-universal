import {
  formatScreenLink,
  type NavigationStreamEvent,
  type ScreenDestination,
} from '@repo/contracts/navigation';
import type { AppOpenResult } from '@repo/contracts/operations';
import { LocalDesktopRequests } from '../local-desktop';
import type { RpcConnection } from '../rpc';

export interface AppNavigationInput {
  serverId: string;
}

/*
 * Sends a destination to at most one live desktop App Connection on the Server Device, the one that listened most
 * recently. It never launches an App, and a delivery says nothing about whether the Screen then opened.
 */
export class AppNavigation {
  private readonly receivers =
    new LocalDesktopRequests<NavigationStreamEvent>();
  public constructor(private readonly input: AppNavigationInput) {}

  public get serverId(): string {
    return this.input.serverId;
  }

  public open(destination: ScreenDestination): AppOpenResult {
    const link = formatScreenLink(this.input.serverId, destination);
    const receiver = this.receivers.latest();

    if (!receiver) return { status: 'not_opened', link };
    receiver.send({ type: 'open', destination });

    return { status: 'delivered', link };
  }

  // A Connection that is not a local desktop App gets its handshake and nothing else.
  public async *requests(
    connection: RpcConnection,
    signal: AbortSignal,
  ): AsyncGenerator<NavigationStreamEvent> {
    yield* this.receivers.listen(connection, signal, {
      type: 'ready',
      serverId: this.input.serverId,
    });
  }
}
