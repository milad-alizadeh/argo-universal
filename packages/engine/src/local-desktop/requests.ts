import { Queue, type RpcConnection } from '../rpc';

interface Receiver<Event> {
  connection: RpcConnection;
  signal: AbortSignal;
  send: (event: Event) => void;
}

// Only the desktop App on the Server Device can receive requests (ADR-0022).
const isLocalDesktop = ({ identity, surface }: RpcConnection): boolean =>
  identity?.serverDevice === true && surface?.platform === 'desktop';

export class LocalDesktopRequests<Event> {
  private readonly receivers = new Set<Receiver<Event>>();

  public latest(): Receiver<Event> | undefined {
    return [...this.receivers].findLast(({ signal }) => !signal.aborted);
  }

  public async *listen(
    connection: RpcConnection,
    signal: AbortSignal,
    ready: Event,
  ): AsyncGenerator<Event> {
    const queue = new Queue<Event>();
    const subscription = AbortSignal.any([signal, connection.signal]);
    const closed = new AbortController();

    const receiver = {
      connection,
      signal: AbortSignal.any([subscription, closed.signal]),
      send: (event: Event): void => queue.push(event),
    };

    if (isLocalDesktop(connection)) this.receivers.add(receiver);

    try {
      yield ready;
      yield* queue.items(receiver.signal);
    } finally {
      this.receivers.delete(receiver);
      closed.abort();
    }
  }
}
