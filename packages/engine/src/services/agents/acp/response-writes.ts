import type { AnyMessage, JsonRpcId, Stream } from '@agentclientprotocol/sdk';
import { createRejectionCounter } from '../../../lib/count-rejections';
import { trackReservationWork, type AcpReservation } from './reservations';

type PendingWrite = ReturnType<typeof Promise.withResolvers<void>>;
type WriteResult = { type: 'written' } | { type: 'failed'; error: unknown };
const settleWrite = (pending: PendingWrite, result: WriteResult): void => {
  if (result.type === 'failed') pending.reject(result.error);
  else pending.resolve();
};
export class AcpResponseWrites {
  private readonly pending = new Map<JsonRpcId, PendingWrite>();
  private readonly rejections = createRejectionCounter('ACP callbacks');
  public constructor(private readonly failed: (error: unknown) => void) {}
  public retain(reservation: AcpReservation, id: JsonRpcId): void {
    if (this.pending.has(id))
      this.reject(new Error('ACP request identity is already pending'));
    const pending = Promise.withResolvers<void>();
    this.pending.set(id, pending);
    void trackReservationWork(reservation, pending.promise);
  }
  public reject(error: Error): never {
    this.rejections.report('Rejected owned request', error);
    this.failed(error);
    throw error;
  }
  public stream(stream: Stream): Stream {
    const writer = stream.writable.getWriter();
    return {
      readable: stream.readable,
      writable: new WritableStream<AnyMessage>({
        write: (message) => this.write(writer, message),
        close: () => writer.close(),
        abort: (reason: unknown) => writer.abort(reason),
      }),
    };
  }
  private async write(
    writer: WritableStreamDefaultWriter<AnyMessage>,
    message: AnyMessage,
  ): Promise<void> {
    try {
      await writer.write(message);
      this.finish(message, { type: 'written' });
    } catch (error) {
      this.finish(message, { type: 'failed', error });
      this.failed(error);
      throw error;
    }
  }
  private finish(message: AnyMessage, result: WriteResult): void {
    if ('method' in message) return;
    const pending = this.pending.get(message.id);
    if (!pending) return;
    this.pending.delete(message.id);
    settleWrite(pending, result);
  }
  public afterExit(): void {
    for (const pending of this.pending.values()) pending.resolve();
    this.pending.clear();
  }
}
