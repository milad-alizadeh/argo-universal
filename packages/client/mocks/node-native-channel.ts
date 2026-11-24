import { inflateRawSync } from 'node:zlib';
import type {
  ByteSocket,
  OpenSocket,
} from '../src/features/connection/api/channel/byte-socket';
import {
  base64Bytes,
  bytesBase64,
} from '../src/features/connection/api/channel/bytes';
import { ChannelCipher } from '../src/features/connection/api/channel/channel-cipher';
import { channelWebSocket } from '../src/features/connection/api/channel/channel-web-socket';
import { CipherState } from '../src/features/connection/api/channel/cipher-state';
import {
  NativeChannel,
  type ChannelHandOver,
  type ChannelNative,
  type ChannelSubscription,
  type NativeChannelEvent,
} from '../src/features/connection/api/channel/native-channel';
import { SecureStream } from '../src/features/connection/api/channel/secure-stream';
import { nodeRandomBytes } from './node-channel-platform';

interface Entry {
  readonly socket: ByteSocket;
  ws?: WebSocket;
}

const noRest = new Uint8Array(0);

const abnormalClosure = 1006;

const noStatus = 1005;

const closeOf = (id: string, event: Event): NativeChannelEvent => ({
  id,
  type: 'close',
  code:
    'code' in event && typeof event.code === 'number' ? event.code : noStatus,
  reason:
    'reason' in event && typeof event.reason === 'string' ? event.reason : '',
});

const rawBytes = (id: string, chunk: Uint8Array): NativeChannelEvent => ({
  id,
  type: 'bytes',
  data: bytesBase64(chunk),
});

// What the module does with a record once compression is agreed: the leading byte says whether the rest is raw deflate, and it inflates it with the platform's own zlib. What it sends is always as it is, behind a zero byte.
class CompressedChannelCipher extends ChannelCipher {
  public override seal(plaintext: Uint8Array): Uint8Array {
    return super.seal(Uint8Array.of(0, ...plaintext));
  }

  public override open(record: Uint8Array): Uint8Array {
    const [lead, ...body] = super.open(record);

    return lead === 1
      ? inflateRawSync(Uint8Array.from(body))
      : Uint8Array.from(body);
  }
}

const cipherOf = (handed: ChannelHandOver): ChannelCipher => {
  const sending = new CipherState(
    base64Bytes(handed.sendKey),
    handed.sendRecords,
  );

  const receiving = new CipherState(
    base64Bytes(handed.receiveKey),
    handed.receiveRecords,
  );

  return handed.compression
    ? new CompressedChannelCipher(sending, receiving)
    : new ChannelCipher(sending, receiving);
};

// Counts what the Server's socket delivers, which is what crosses the network.
class CountingSocket implements ByteSocket {
  public constructor(
    private readonly socket: ByteSocket,
    private readonly count: (bytes: number) => void,
  ) {}

  public set onData(handler: (chunk: Uint8Array) => void) {
    this.socket.onData = (chunk): void => {
      this.count(chunk.length);
      handler(chunk);
    };
  }

  public get onData(): (chunk: Uint8Array) => void {
    return this.socket.onData;
  }

  public set onClose(handler: (error?: Error) => void) {
    this.socket.onClose = handler;
  }

  public get onClose(): (error?: Error) => void {
    return this.socket.onClose;
  }

  public write(data: Uint8Array): void {
    this.socket.write(data);
  }

  public close(): void {
    this.socket.close();
  }
}

/*
 * The native module's contract, kept in Node. It tests the JavaScript side of the hand-over (the keys, the record numbers, one string per message), not Swift or Kotlin: after the hand-over it reuses the JavaScript framing, so the native record paths have tests of their own (`apps/universal-app/modules/argo-channel`).
 * Its sockets come from the `openSocket` it is given. It does the one thing the real module does that matters to JavaScript: it takes the keys and record numbers it is handed, and from then on sends only finished message strings.
 */
export class NodeNativeModule implements ChannelNative {
  // Every message string the module handed up.
  public readonly messages: string[] = [];
  private readonly entries = new Map<string, Entry>();
  private readonly listeners = new Set<(event: NativeChannelEvent) => void>();
  private rawEventsAfterHandOver = 0;
  private wireAfterHandOver = 0;
  private count = 0;

  public constructor(private readonly openSocket: OpenSocket) {}

  // Handshake bytes the module passed up after the hand-over; there should be none.
  public bytesAfterHandOver(): number {
    return this.rawEventsAfterHandOver;
  }

  // What the Server's socket delivered after the hand-over: the bytes that crossed the network for the messages the module handed up.
  public wireBytesAfterHandOver(): number {
    return this.wireAfterHandOver;
  }

  public opened(): number {
    return this.count;
  }

  // As when the network drops under the phone: every socket the module holds closes.
  public closeAll(): void {
    for (const entry of this.entries.values()) entry.socket.close();
  }

  public async open(id: string, url: string): Promise<void> {
    const { hostname, port } = new URL(url);

    const socket = await this.openSocket({
      host: hostname,
      port: Number(port),
    });

    this.count += 1;
    this.entries.set(id, { socket });
    socket.onData = (chunk): void => this.emit(id, rawBytes(id, chunk));

    socket.onClose = (error): void =>
      this.emit(id, {
        id,
        type: 'close',
        code: abnormalClosure,
        reason: '',
        error: error?.message,
      });
  }

  public write(id: string, bytes: Uint8Array): void {
    this.entryOf(id).socket.write(bytes);
  }

  public handOver(id: string, handed: ChannelHandOver): void {
    const entry = this.entryOf(id);

    const stream = new SecureStream(
      new CountingSocket(entry.socket, (bytes) => {
        this.wireAfterHandOver += bytes;
      }),
      cipherOf(handed),
      noRest,
    );

    const Socket = channelWebSocket({
      openChannel: async () => ({
        stream,
        deviceId: 'native',
        compressed: handed.compression,
      }),
      randomBytes: nodeRandomBytes,
    });

    const ws = new Socket(`wss://argo.channel${handed.upgrade.split(' ')[1]}`);

    entry.ws = ws;
    this.relay(id, ws);
  }

  public send(id: string, message: string): void {
    this.entryOf(id).ws?.send(message);
  }

  public close(id: string, code: number, reason: string): void {
    const { ws, socket } = this.entryOf(id);

    if (ws) ws.close(code, reason);
    else socket.close();
  }

  public addListener(
    _name: 'channel',
    listener: (event: NativeChannelEvent) => void,
  ): ChannelSubscription {
    this.listeners.add(listener);

    return { remove: (): void => void this.listeners.delete(listener) };
  }

  private relay(id: string, ws: WebSocket): void {
    ws.addEventListener('open', () => this.emit(id, { id, type: 'open' }));

    ws.addEventListener('message', (event) => {
      if (!('data' in event)) return;
      this.messages.push(String(event.data));
      this.emit(id, { id, type: 'message', data: String(event.data) });
    });

    ws.addEventListener('close', (event) => this.emit(id, closeOf(id, event)));
  }

  private emit(id: string, event: NativeChannelEvent): void {
    const entry = this.entries.get(id);

    if (!entry) return;

    if (entry.ws && event.type === 'bytes') this.rawEventsAfterHandOver += 1;

    for (const listener of this.listeners) listener(event);
  }

  private entryOf(id: string): Entry {
    const entry = this.entries.get(id);

    if (!entry) throw new Error(`No socket ${id}`);

    return entry;
  }
}

export interface NodeNative {
  readonly channel: NativeChannel;
  readonly module: NodeNativeModule;
}

export function nodeNativeChannel(openSocket: OpenSocket): NodeNative {
  const module = new NodeNativeModule(openSocket);

  return { channel: new NativeChannel(module), module };
}
