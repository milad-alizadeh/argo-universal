import { channelCompressionHeader } from '@repo/contracts';
import type {
  ByteSocket,
  ChannelAddress,
  OpenSocket,
  UpgradeHeaders,
} from './byte-socket';
import { base64Bytes } from './bytes';
import { channelUrl } from './web-socket-carrier';

// How long the module waits for the socket to open, as the JavaScript carrier does.
const connectTimeoutMs = 4000;

const normalClosure = 1000;

// The module inflates raw deflate, so every socket it opens offers compression on its upgrade. A Server built before this never reads the header, and says in its welcome whether it agreed (ADR-0045).
const upgradeHeaders: UpgradeHeaders = {
  [channelCompressionHeader]: 'deflate-raw',
};

// The channel as the module takes it over: the two keys, where each direction's record numbers stand, and the WebSocket upgrade that goes inside it. Keys are base64.
export interface ChannelHandOver {
  readonly sendKey: string;
  readonly sendRecords: number;
  readonly receiveKey: string;
  readonly receiveRecords: number;
  // The HTTP upgrade request the module seals and sends first, and the `Sec-WebSocket-Accept` its answer must carry.
  readonly upgrade: string;
  readonly accept: string;
  // Whether every record opens with the byte that says whether the rest is raw deflate, which the module inflates (ADR-0045).
  readonly compression: boolean;
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

// Where the module connects, how long it waits, and what its WebSocket upgrade carries.
export interface OpenRequest {
  readonly url: string;
  readonly timeoutMs: number;
  readonly headers: UpgradeHeaders;
}

export interface ChannelSubscription {
  readonly remove: () => void;
}

/*
 * The native module's surface (`ArgoChannel`, Swift and Kotlin). It owns the channel's WebSocket: `open` connects it, and from `handOver` on the module decrypts every record, so it gives JavaScript one message string per event and takes one per `send`.
 * JavaScript names each socket, so it is listening before `open` can raise an event. The module is an Expo module: its events arrive through `addListener`.
 */
export interface ChannelNative {
  open: (id: string, request: OpenRequest) => Promise<void>;
  // Handshake bytes to the Server. A `Uint8Array` is an Expo module's `Data` or `ByteArray`.
  write: (id: string, bytes: Uint8Array) => void;
  handOver: (id: string, handOver: ChannelHandOver) => void;
  send: (id: string, message: string) => void;
  close: (id: string, code: number, reason: string) => void;
  addListener: (
    name: 'channel',
    listener: (event: NativeChannelEvent) => void,
  ) => ChannelSubscription;
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
    this.channel.native.write(this.id, data);
  }

  public close(): void {
    this.channel.native.close(this.id, normalClosure, '');
  }
}

export class NativeChannel {
  private readonly handlers = new Map<string, Handler>();
  private opened = 0;

  public constructor(public readonly native: ChannelNative) {
    native.addListener('channel', (event) =>
      this.handlers.get(event.id)?.(event),
    );
  }

  // Opens the module's socket to the Server, ready for the handshake.
  public readonly openSocket: OpenSocket = async (address) =>
    this.socketAt(address);

  public watch(id: string, handler: Handler): void {
    this.handlers.set(id, handler);
  }

  public forget(id: string): void {
    this.handlers.delete(id);
  }

  private async socketAt(address: ChannelAddress): Promise<NativeByteSocket> {
    this.opened += 1;
    const id = String(this.opened);
    const socket = new NativeByteSocket(id, this);

    try {
      await this.native.open(id, {
        url: channelUrl(address),
        timeoutMs: connectTimeoutMs,
        headers: upgradeHeaders,
      });
    } catch (cause) {
      this.forget(id);
      throw cause;
    }

    return socket;
  }
}
