import type { ByteSocket } from './byte-socket';
import { concatBytes } from './bytes';
import { FrameReader, frameRecord } from './frames';

interface Waiter {
  resolve: (record: Uint8Array) => void;
  reject: (error: Error) => void;
}

// One socket can deliver several records in a single tick, so every record is queued until the handshake asks for it.
export class RecordInbox {
  private readonly reader = new FrameReader();
  private readonly queued: Uint8Array[] = [];
  private waiter: Waiter | undefined;
  private closed: Error | undefined;

  public constructor(socket: ByteSocket) {
    socket.onData = (chunk): void => {
      this.queued.push(...this.reader.push(chunk));
      this.deliver();
    };

    socket.onClose = (error): void => {
      this.closed = error ?? new Error('The Server closed the channel');
      this.deliver();
    };
  }

  public next(): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject): void => {
      this.waiter = { resolve, reject };
      this.deliver();
    });
  }

  // The records that came after the handshake, framed again for the stream that reads them next.
  public rest(): Uint8Array {
    return concatBytes(...this.queued.splice(0).map(frameRecord));
  }

  private deliver(): void {
    const waiter = this.waiter;

    if (!waiter) return;
    const settle = this.settlement();

    if (!settle) return;
    this.waiter = undefined;
    settle(waiter);
  }

  private settlement(): ((waiter: Waiter) => void) | undefined {
    const record = this.queued.shift();

    if (record) return (waiter) => waiter.resolve(record);
    const closed = this.closed;

    return closed && ((waiter): void => waiter.reject(closed));
  }
}
