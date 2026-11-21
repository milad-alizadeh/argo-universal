import {
  type ChartPreviewReply,
  type ChartPreviewRequest,
  type ChartPreviewAnswer,
  type ChartPreviewDraft,
} from '@repo/contracts/operations/chart';
import { isLocalDesktop } from '../app-navigation';
import { Queue } from '../app-navigation/queue';
import type { RpcConnection } from '../rpc';

type Receiver = {
  connection: RpcConnection;
  queue: Queue<ChartPreviewRequest>;
  signal: AbortSignal;
};

type Capture = {
  receiver: Receiver;
  requestId: string;
  settle: (answer: ChartPreviewAnswer) => void;
};

const unavailable = (reason: string): ChartPreviewAnswer => ({
  status: 'unavailable',
  reason,
});

const desktopClosed = unavailable('The desktop Chart renderer disconnected.');

const captureDeadlineMs = 20_000;

// Drafts go to one local desktop App and are held only while that App answers.
export class ChartPreview {
  private readonly receivers = new Set<Receiver>();
  private capture: Capture | undefined;
  private sequence = 0;

  public render(draft: ChartPreviewDraft): Promise<ChartPreviewAnswer> {
    const receiver = [...this.receivers].findLast(
      ({ signal }) => !signal.aborted,
    );

    if (!receiver)
      return Promise.resolve(
        unavailable('No desktop Chart renderer is available on this Server.'),
      );

    if (this.capture)
      return Promise.resolve(
        unavailable(
          'The desktop Chart renderer is already capturing a preview.',
        ),
      );

    const requestId = String(++this.sequence);
    const result = Promise.withResolvers<ChartPreviewAnswer>();

    const settle = (answer: ChartPreviewAnswer): void => {
      clearTimeout(deadline);
      this.capture = undefined;
      result.resolve(answer);
    };

    const deadline = setTimeout(
      () =>
        settle(
          unavailable('The desktop Chart renderer did not finish in time.'),
        ),
      captureDeadlineMs,
    );

    this.capture = { receiver, requestId, settle };
    receiver.queue.push({ type: 'capture', requestId, draft });

    return result.promise;
  }

  public answer(connection: RpcConnection, reply: ChartPreviewReply): void {
    const capture = this.capture;

    if (
      capture?.receiver.connection === connection &&
      capture.requestId === reply.requestId
    )
      capture.settle(reply.answer);
  }

  public async *requests(
    connection: RpcConnection,
    signal: AbortSignal = connection.signal,
  ): AsyncGenerator<ChartPreviewRequest> {
    const receiver = {
      connection,
      queue: new Queue<ChartPreviewRequest>(),
      signal: AbortSignal.any([signal, connection.signal]),
    };

    if (isLocalDesktop(connection)) this.receivers.add(receiver);

    try {
      yield { type: 'ready' };

      for await (const event of receiver.queue.items(receiver.signal)) {
        if (
          event.type === 'capture' &&
          this.capture?.requestId === event.requestId
        )
          yield event;
      }
    } finally {
      this.receivers.delete(receiver);

      if (this.capture?.receiver === receiver)
        this.capture.settle(desktopClosed);
    }
  }
}
