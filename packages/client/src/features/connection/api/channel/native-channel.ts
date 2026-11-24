import type { ByteSocket, ChannelAddress, OpenSocket } from './byte-socket';
import { base64Bytes, bytesBase64 } from './bytes';
import { channelUrl } from './web-socket-carrier';

// How long the module waits for the socket to open, as the JavaScript carrier does.
const connectTimeoutMs = 4000;

// The channel as the module takes it over: the two keys, where each direction's record numbers stand, and the WebSocket upgrade that goes inside it. Keys are base64.
export interface ChannelHandOver {
  readonly sendKey: string;
  readonly sendRecords: number;
  readonly receiveKey: string;
  readonly receiveRecords: number;
  // The HTTP upgrade request the module seals and sends first, and the `Sec-WebSocket-Accept` its answer must carry.
  readonly upgrade: string;
  readonly accept: string;
}

/*
 * What the module says about one socket. Before the hand-over it passes the Server's bytes on (`bytes`, base64) so JavaScript can run the handshake; after it, the module has opened, decrypted and framed everything itself and sends only finished messages.
 */
export type NativeChannelEvent = { readonly id: string } & (
  | { readonly type: 'bytes'; readonly data: string }
  | { readonly type: 'open' }
  | { readonly type: 'message'; readonly data: string }
  | {
      readonly type: 'close';
      readonly code: number;
      readonly reason: string;
      readonly error?: string;
    }
);

/*
 * The native module's surface (`ArgoChannel`, Swift and Kotlin). It owns the channel's WebSocket: `open` connects it, and from `handOver` on the module decrypts every record, so it gives JavaScript one message string per event and takes one per `send`.
 * Events of a socket are held back until `listen`, so none is lost between `open` and the first handler; `listen` again is harmless.
 */
export interface ChannelNative {
  open: (url: string, timeoutMs: number) => Promise<string>;
  listen: (id: string) => void;
  write: (id: string, base64: string) => void;
  handOver: (id: string, handOver: ChannelHandOver) => void;
  send: (id: string, message: string) => void;
  close: (id: string, code: number, reason: string) => void;
  subscribe: (listener: (event: NativeChannelEvent) => void) => () => void;
}

type Handler = (event: NativeChannelEvent) => void;

// A socket the module owns, as the handshake sees it: bytes in and out. It carries its id so the channel's WebSocket can find the same socket in the module.
export class NativeByteSocket implements ByteSocket {
  public onData: (chunk: Uint8Array) => void = () => {};
  public onClose: (error?: Error) => void = () => {};

  public constructor(
    public readonly id: string,
    private readonly channel: NativeChannel,
  ) {
    channel.watch(id, (event) => {
      if (event.type === 'bytes') this.onData(base64Bytes(event.data));
      else if (event.type === 'close')
        this.onClose(event.error ? new Error(event.error) : undefined);
    });
  }

  public write(data: Uint8Array): void {
    this.channel.native.write(this.id, bytesBase64(data));
  }

  public close(): void {
    this.channel.native.close(this.id, 1000, '');
  }
}

export class NativeChannel {
  private readonly handlers = new Map<string, Handler>();

  public constructor(public readonly native: ChannelNative) {
    native.subscribe((event) => this.handlers.get(event.id)?.(event));
  }

  // Opens the module's socket to the Server, ready for the handshake.
  public readonly openSocket: OpenSocket = async (address) =>
    this.socketAt(address);

  public watch(id: string, handler: Handler): void {
    this.handlers.set(id, handler);
    this.native.listen(id);
  }

  public forget(id: string): void {
    this.handlers.delete(id);
  }

  private async socketAt(address: ChannelAddress): Promise<NativeByteSocket> {
    const id = await this.native.open(channelUrl(address), connectTimeoutMs);

    return new NativeByteSocket(id, this);
  }
}
