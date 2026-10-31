import type { Socket } from 'node:net';
import { Duplex } from 'node:stream';
import type { ChannelCipher } from './channel-cipher';
import { channelFailure } from './channel-failure';
import { tagBytes } from './cipher-state';
import { FrameReader, frameRecord, maxRecordBytes } from './frames';

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
    private readonly socket: Socket,
    private readonly cipher: ChannelCipher,
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

  public override _read(): void {
    this.socket.resume();
  }

  public override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    done: (error?: Error | null) => void,
  ): void {
    try {
      for (const piece of pieces(chunk))
        this.socket.write(frameRecord(this.cipher.seal(piece)));
      done();
    } catch (error) {
      done(channelFailure(error));
    }
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
    if (!this.push(this.cipher.open(record))) this.socket.pause();
  }
}

function* pieces(chunk: Buffer): Generator<Buffer> {
  for (let start = 0; start < chunk.length; start += maxPlaintextBytes)
    yield chunk.subarray(start, start + maxPlaintextBytes);
}
