import {
  type ChartPreviewReply,
  type ChartPreviewRequest,
  type ChartPreviewAnswer,
  type ChartPreviewDraft,
} from '@repo/contracts/operations/chart';
import { LocalDesktopRequests, PendingReplies } from '../local-desktop';
import type { RpcConnection } from '../rpc';

const unavailable = (reason: string): ChartPreviewAnswer => ({
  status: 'unavailable',
  reason,
});

const desktopClosed = unavailable('The desktop Chart renderer disconnected.');

const captureDeadlineMs = 20_000;

// Drafts go to one local desktop App and are held only while that App answers.
export class ChartPreview {
  private readonly receivers = new LocalDesktopRequests<ChartPreviewRequest>();
  private readonly pending = new PendingReplies<ChartPreviewAnswer>();

  public render(draft: ChartPreviewDraft): Promise<ChartPreviewAnswer> {
    const receiver = this.receivers.latest();

    if (!receiver)
      return Promise.resolve(
        unavailable('No desktop Chart renderer is available on this Server.'),
      );

    if (this.pending.busy)
      return Promise.resolve(
        unavailable(
          'The desktop Chart renderer is already capturing a preview.',
        ),
      );

    return this.pending.ask({
      connection: receiver.connection,
      signal: receiver.signal,
      disconnected: desktopClosed,
      deadline: {
        milliseconds: captureDeadlineMs,
        answer: unavailable(
          'The desktop Chart renderer did not finish in time.',
        ),
      },
      send: (requestId) => receiver.send({ type: 'capture', requestId, draft }),
    });
  }

  public answer(connection: RpcConnection, reply: ChartPreviewReply): void {
    this.pending.answer(connection, reply);
  }

  public async *requests(
    connection: RpcConnection,
    signal: AbortSignal = connection.signal,
  ): AsyncGenerator<ChartPreviewRequest> {
    for await (const event of this.receivers.listen(connection, signal, {
      type: 'ready',
    })) {
      if (event.type === 'ready' || this.pending.has(event.requestId))
        yield event;
    }
  }
}
