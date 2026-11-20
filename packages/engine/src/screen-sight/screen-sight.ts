import type {
  AppScreenshotResult,
  ScreenRequester,
  ScreenSightReply,
  ScreenSightStreamEvent,
} from '@repo/contracts/operations';
import { isLocalDesktop } from '../app-navigation';
import { Queue } from '../app-navigation/queue';
import type { RpcConnection } from '../rpc';
import { noticeFor, type ScreenNotice } from './notices';
import { PendingCaptures } from './pending-captures';

export type NoticeWriter = (sessionId: string, notice: ScreenNotice) => void;

interface Receiver {
  connection: RpcConnection;
  queue: Queue<ScreenSightStreamEvent>;
}

const live = ({ connection }: Receiver): boolean => !connection.signal.aborted;

/*
 * Takes a picture of the person's whole screen by asking the one desktop App on the Server Device (ADR-0064's
 * amendment on screen sight). The picture is held only while a reader waits for it: nothing here keeps one, and
 * the Feed gets one Notice that a capture was taken, never the picture.
 */
export class ScreenSight {
  private readonly receivers = new Set<Receiver>();
  private readonly pending = new PendingCaptures();

  // `notify` writes a capture's Notice into the requesting Session's Feed.
  public constructor(private readonly notify: NoticeWriter = (): void => {}) {}

  public async capture(
    requester: ScreenRequester,
  ): Promise<AppScreenshotResult> {
    const result = await this.take(requester);
    this.announce(requester, result);

    return result;
  }

  private take(requester: ScreenRequester): Promise<AppScreenshotResult> {
    const receiver = [...this.receivers].findLast(live);

    if (!receiver) return Promise.resolve({ status: 'not_opened' });

    return this.ask(receiver, requester);
  }

  private ask(
    { connection, queue }: Receiver,
    requester: ScreenRequester,
  ): Promise<AppScreenshotResult> {
    return this.pending.ask(connection, (requestId) =>
      queue.push({ type: 'capture', requestId, requester }),
    );
  }

  private announce(
    requester: ScreenRequester,
    result: AppScreenshotResult,
  ): void {
    if (requester.kind !== 'person')
      this.notify(requester.sessionId, noticeFor(requester, result));
  }

  // What an App says to a request: only the Connection that was asked may answer it.
  public answer(connection: RpcConnection, reply: ScreenSightReply): void {
    this.pending.answer(connection, reply);
  }

  // A Connection that is not a local desktop App gets its handshake and nothing else.
  public async *requests(
    connection: RpcConnection,
    signal: AbortSignal = connection.signal,
  ): AsyncGenerator<ScreenSightStreamEvent> {
    const queue = new Queue<ScreenSightStreamEvent>();
    const receiver: Receiver = { connection, queue };

    if (isLocalDesktop(connection)) this.receivers.add(receiver);

    try {
      yield { type: 'ready' };
      yield* queue.items(AbortSignal.any([signal, connection.signal]));
    } finally {
      this.receivers.delete(receiver);
    }
  }
}
