import type {
  AppScreenshotResult,
  ScreenRequester,
  ScreenSightReply,
  ScreenSightReport,
  ScreenSightStreamEvent,
} from '@repo/contracts/operations';
import { isLocalDesktop } from '../app-navigation';
import { Queue } from '../app-navigation/queue';
import type { RpcConnection } from '../rpc';
import { PendingCaptures } from './pending-captures';

// A Notice the capture writes into the Session's Feed; the picture itself never goes there.
export interface ScreenNotice {
  title: string;
  description: string;
}

export type NoticeWriter = (sessionId: string, notice: ScreenNotice) => void;

interface Receiver {
  connection: RpcConnection;
  // Whether the person turned screen sight on for this Device; the App reports it when it listens.
  enabled: boolean;
  queue: Queue<ScreenSightStreamEvent>;
}

const live = ({ connection }: Receiver): boolean => !connection.signal.aborted;

// Why no picture was taken, in the words the person reads in the Feed.
const missWords = {
  refused: 'No picture was taken: it was declined or screen sight is off.',
  not_opened: 'No picture was taken: no Argo desktop App could be reached.',
  not_available:
    'No picture was taken: this computer would not let Argo capture the screen.',
} as const;

const noticeFor = (requester: ScreenRequester): ScreenNotice => ({
  title: 'Screen captured',
  description:
    requester.kind === 'voice'
      ? 'The voice looked at a picture of your screen.'
      : 'The Agent took a picture of your screen.',
});

const missedNoticeFor = (
  requester: ScreenRequester,
  result: Exclude<AppScreenshotResult, { status: 'captured' }>,
): ScreenNotice => ({
  title: 'Screen not captured',
  description: `${requester.kind === 'voice' ? 'The voice' : 'The Agent'} asked to see your screen. ${missWords[result.status]}`,
});

const sessionOf = (requester: ScreenRequester): string | null =>
  requester.kind === 'person' ? null : requester.sessionId;

/*
 * Takes a picture of the person's whole screen by asking the one desktop App on the Server Device (ADR-0064's
 * amendment on screen sight). The picture is held only while a reader waits for it: nothing here keeps one, and
 * the Feed gets one Notice that a capture was taken, never the picture.
 */
export class ScreenSight {
  private readonly receivers = new Set<Receiver>();
  private readonly pending = new PendingCaptures();
  private notify: NoticeWriter = () => {};

  // Where a capture's Notice is written, once Sessions exist.
  public attach(notify: NoticeWriter): void {
    this.notify = notify;
  }

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

    if (!receiver.enabled)
      return Promise.resolve({ status: 'refused', reason: 'off' });

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
    const sessionId = sessionOf(requester);

    if (!sessionId) return;

    this.notify(
      sessionId,
      result.status === 'captured'
        ? noticeFor(requester)
        : missedNoticeFor(requester, result),
    );
  }

  // What an App says to a request: only the Connection that was asked may answer it.
  public answer(connection: RpcConnection, reply: ScreenSightReply): void {
    this.pending.answer(connection, reply);
  }

  // A Connection that is not a local desktop App gets its handshake and nothing else.
  public async *requests(
    connection: RpcConnection,
    { enabled }: ScreenSightReport,
    signal: AbortSignal = connection.signal,
  ): AsyncGenerator<ScreenSightStreamEvent> {
    const queue = new Queue<ScreenSightStreamEvent>();
    const receiver: Receiver = { connection, enabled, queue };

    if (isLocalDesktop(connection)) this.receivers.add(receiver);

    try {
      yield { type: 'ready' };
      yield* queue.items(AbortSignal.any([signal, connection.signal]));
    } finally {
      this.receivers.delete(receiver);
    }
  }
}
