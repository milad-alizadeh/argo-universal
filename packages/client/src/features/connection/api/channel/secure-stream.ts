import type { ByteSocket } from './byte-socket';
import type { ChannelCipher } from './channel-cipher';
import { tagBytes } from './cipher-state';
import { FrameReader, frameRecord, maxRecordBytes } from './frames';

const maxPlaintextBytes = maxRecordBytes - tagBytes;

export interface StreamListener {
  onData: (chunk: Uint8Array) => void;
  onClose: (error?: Error) => void;
}

function* pieces(data: Uint8Array): Generator<Uint8Array> {
  for (let start = 0; start < data.length; start += maxPlaintextBytes)
    yield data.subarray(start, start + maxPlaintextBytes);
}

/*
 * The plaintext inside the channel, as a byte stream. What is written goes out as numbered records on the TCP socket, and the records that arrive come back as bytes, in order.
 * A record that fails its authentication tag is not from the Device that opened the channel, so the stream ends instead of carrying on.
 */
export class SecureStream {
  private readonly records = new FrameReader();
  private readonly early: Uint8Array[] = [];
  private listener: StreamListener | undefined;
  private ended: { error?: Error } | undefined;

  public constructor(
    private readonly socket: ByteSocket,
    private readonly cipher: ChannelCipher,
    rest: Uint8Array,
  ) {
    socket.onData = (chunk): void => this.receive(chunk);
    socket.onClose = (error): void => this.end(error);
    this.receive(rest);
  }

  // Bytes that arrived before anyone listened are delivered first, so nothing is lost between the handshake and the caller's first read.
  public listen(listener: StreamListener): void {
    this.listener = listener;

    for (const chunk of this.early.splice(0)) listener.onData(chunk);

    if (this.ended) listener.onClose(this.ended.error);
  }

  public write(data: Uint8Array): void {
    for (const piece of pieces(data))
      this.socket.write(frameRecord(this.cipher.seal(piece)));
  }

  public close(): void {
    this.socket.close();
    this.end();
  }

  private receive(chunk: Uint8Array): void {
    try {
      this.open(chunk);
    } catch (cause) {
      this.socket.close();
      this.end(cause instanceof Error ? cause : new Error(String(cause)));
    }
  }

  private open(chunk: Uint8Array): void {
    for (const record of this.records.push(chunk))
      this.deliver(this.cipher.open(record));
  }

  private deliver(plaintext: Uint8Array): void {
    if (this.listener) this.listener.onData(plaintext);
    else this.early.push(plaintext);
  }

  private end(error?: Error): void {
    if (this.ended) return;
    this.ended = { error };
    this.listener?.onClose(error);
  }
}
