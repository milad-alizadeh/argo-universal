import { Duplex } from 'node:stream';
import type { ChannelCarrier } from './channel-carrier';
import type { ChannelCipher } from './channel-cipher';
import { channelFailure } from './channel-failure';
import { tagBytes } from './cipher-state';
import { FrameReader, frameRecord, maxRecordBytes } from './frames';
import { leadingBytes, packRecord, unpackRecord } from './record-compression';

const maxPlaintextBytes = maxRecordBytes - tagBytes;

/*
 * The plaintext inside the channel, as a socket. Whatever is written to it goes out as numbered records on the TCP socket underneath, and the records that arrive come back out of it in order.
 * It stands where a TCP socket stands, so the Server serves the same tRPC, Blobs and Plugin assets over it without knowing it is encrypted; the no-op timing calls are the ones an HTTP server and a WebSocket make on a socket they are handed.
 */
export class ChannelSocket extends Duplex {
  public readonly remoteAddress: string | undefined;
  public readonly localAddress: string | undefined;
  private readonly records = new FrameReader();

  public constructor(
    private readonly socket: ChannelCarrier,
    private readonly cipher: ChannelCipher,
    // Whether the App offered compression and this Server agreed: every record then opens with the byte that says which (ADR-0045).
    private readonly compression = false,
  ) {
    super();
    this.remoteAddress = socket.remoteAddress;
    this.localAddress = socket.localAddress;
    socket.on('data', (chunk: Buffer): void => this.receive(chunk));
    socket.once('close', (): void => this.finish());
    socket.once('error', (error: Error): void => void this.destroy(error));
  }

  public setNoDelay(): this {
    return this;
  }

  public setKeepAlive(): this {
    return this;
  }

  public setTimeout(): this {
    return this;
  }

  // What a keep-alive HTTP client calls on the socket it parks between requests; the channel's lifetime is the socket underneath's.
  public ref(): this {
    return this;
  }

  public unref(): this {
    return this;
  }

  public override _read(): void {
    this.socket.resume();
  }

  public override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    done: (error?: Error | null) => void,
  ): void {
    if (this.compression) {
      this.writeDeflated(chunk).then(
        () => done(),
        (error: Error) => done(channelFailure(error)),
      );

      return;
    }

    try {
      for (const piece of pieces(chunk, this.pieceBytes()))
        this.socket.write(frameRecord(this.cipher.seal(piece)));
      done();
    } catch (error) {
      done(channelFailure(error));
    }
  }

  // Deflating a piece takes a thread of Node's pool, not the event loop. A Duplex starts no write until the last one is done, and the pieces are awaited one at a time, so records are sealed and written in the order they were numbered.
  private async writeDeflated(chunk: Buffer): Promise<void> {
    for (const piece of pieces(chunk, this.pieceBytes()))
      this.socket.write(frameRecord(this.cipher.seal(await packRecord(piece))));
  }

  // A WebSocket writes a message's header and payload back to back, so they are joined into one record rather than sealed as two.
  public override _writev(
    chunks: { chunk: Buffer }[],
    done: (error?: Error | null) => void,
  ): void {
    this._write(Buffer.concat(chunks.map(({ chunk }) => chunk)), 'utf8', done);
  }

  public override _final(done: (error?: Error | null) => void): void {
    this.socket.end();
    done();
  }

  public override _destroy(
    error: Error | null,
    done: (error?: Error | null) => void,
  ): void {
    this.socket.destroy();
    done(error);
  }

  /*
   * The TCP socket underneath has gone, so this one is over: whatever has already arrived is pushed, and then it closes the way a socket whose peer has gone closes.
   * Nothing is left half-open, because a half-open channel is one a Connection would wait on forever when the owner turns Local network access off under it.
   */
  private finish(): void {
    this.push(null);
    this.destroy();
  }

  // A record that does not open with this channel's key is not from the Device that opened it, so the Connection ends rather than carrying on.
  private receive(chunk: Buffer): void {
    try {
      for (const record of this.records.push(chunk)) this.pushRecord(record);
    } catch (error) {
      this.destroy(channelFailure(error));
    }
  }

  private pushRecord(record: Buffer): void {
    const plaintext = this.cipher.open(record);

    if (!this.push(this.unpack(plaintext))) this.socket.pause();
  }

  // The leading byte takes a byte of every record, so a piece is one byte shorter.
  private pieceBytes(): number {
    return this.compression
      ? maxPlaintextBytes - leadingBytes
      : maxPlaintextBytes;
  }

  private unpack(plaintext: Buffer): Buffer {
    return this.compression
      ? unpackRecord(plaintext, this.pieceBytes())
      : plaintext;
  }
}

function* pieces(chunk: Buffer, size: number): Generator<Buffer> {
  for (let start = 0; start < chunk.length; start += size)
    yield chunk.subarray(start, start + size);
}
