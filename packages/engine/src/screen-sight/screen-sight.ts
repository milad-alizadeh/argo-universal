import type {
  AppScreenshotResult,
  ScreenRequester,
  ScreenSightReply,
  ScreenSightStreamEvent,
} from '@repo/contracts/operations';
import { LocalDesktopRequests, PendingReplies } from '../local-desktop';
import type { RpcConnection } from '../rpc';
import { noticeFor, type ScreenNotice } from './notices';

export type NoticeWriter = (sessionId: string, notice: ScreenNotice) => void;

/*
 * Takes a picture of the person's whole screen by asking the one desktop App on the Server Device (ADR-0064's
 * amendment on screen sight). The picture is held only while a reader waits for it: nothing here keeps one, and
 * the Feed gets one Notice that a capture was taken, never the picture.
 */
export class ScreenSight {
  private readonly receivers =
    new LocalDesktopRequests<ScreenSightStreamEvent>();
  private readonly pending = new PendingReplies<AppScreenshotResult>('screen-');

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
    const receiver = this.receivers.latest();

    if (!receiver) return Promise.resolve({ status: 'not_opened' });

    return this.pending.ask({
      connection: receiver.connection,
      signal: receiver.signal,
      disconnected: { status: 'not_opened' },
      send: (requestId) =>
        receiver.send({ type: 'capture', requestId, requester }),
    });
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
    yield* this.receivers.listen(connection, signal, { type: 'ready' });
  }
}
