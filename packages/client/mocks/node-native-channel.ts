import { aead } from '../src/features/connection/api/channel/aead';
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
  type NativeChannelEvent,
} from '../src/features/connection/api/channel/native-channel';
import { SecureStream } from '../src/features/connection/api/channel/secure-stream';
import { nodeRandomBytes } from './node-channel-platform';

interface Entry {
  readonly socket: ByteSocket;
  listening: boolean;
  held: NativeChannelEvent[];
  handedOver: boolean;
  closed: boolean;
  ws?: WebSocket;
}

const noRest = new Uint8Array(0);

const portOf = (url: string): number => Number(new URL(url).port);

const hostOf = (url: string): string => new URL(url).hostname;

/*
 * The native module's contract, kept in Node: sockets come from the `openSocket` it is given and, after the hand-over, the channel runs on the same JavaScript framing the web uses. It does the one thing the real module does that matters to JavaScript: it takes the keys and record numbers it is handed, and from then on sends only finished message strings. A test that passes through it proves what the JavaScript side hands over and does with what it gets back.
 */
export function nodeNativeChannel(openSocket: OpenSocket): {
  channel: NativeChannel;
  // Every message string the module handed up.
  messages: string[];
  bytesAfterHandOver: () => number;
  opened: () => number;
  // As when the network drops under the phone: every socket the module holds closes.
  dropSockets: () => void;
  close: () => void;
} {
  const entries = new Map<string, Entry>();
  const listeners = new Set<(event: NativeChannelEvent) => void>();
  const messages: string[] = [];
  let rawBytesAfterHandOver = 0;
  let count = 0;

  const deliver = (event: NativeChannelEvent): void => {
    for (const listener of listeners) listener(event);
  };

  const emit = (id: string, event: NativeChannelEvent): void => {
    const entry = entries.get(id);

    if (!entry) return;
    if (event.type === 'close') entry.closed = true;
    if (entry.listening) deliver(event);
    else entry.held.push(event);
  };

  const entryOf = (id: string): Entry => {
    const entry = entries.get(id);

    if (!entry) throw new Error(`No socket ${id}`);

    return entry;
  };

  const handOver = (id: string, handed: ChannelHandOver): void => {
    const entry = entryOf(id);
    const cipher = new ChannelCipher(
      new CipherState(base64Bytes(handed.sendKey), aead, handed.sendRecords),
      new CipherState(
        base64Bytes(handed.receiveKey),
        aead,
        handed.receiveRecords,
      ),
    );

    const stream = new SecureStream(entry.socket, cipher, noRest);
    const path = handed.upgrade.split(' ')[1] ?? '/';

    const Socket = channelWebSocket({
      openChannel: async () => ({ stream, deviceId: 'native' }),
      randomBytes: nodeRandomBytes,
    });

    const ws = new Socket(`wss://argo.channel${path}`);
    entry.handedOver = true;
    entry.ws = ws;
    ws.addEventListener('open', () => emit(id, { id, type: 'open' }));

    ws.addEventListener('message', (event) => {
      messages.push(String(event.data));
      emit(id, { id, type: 'message', data: String(event.data) });
    });

    ws.addEventListener('close', (event) =>
      emit(id, {
        id,
        type: 'close',
        code: (event as CloseEvent).code,
        reason: (event as CloseEvent).reason,
      }),
    );
  };

  const module: ChannelNative = {
    open: async (url) => {
      const socket = await openSocket({ host: hostOf(url), port: portOf(url) });
      count += 1;
      const id = String(count);
      const entry: Entry = {
        socket,
        listening: false,
        held: [],
        handedOver: false,
        closed: false,
      };

      entries.set(id, entry);

      socket.onData = (chunk): void => {
        if (entry.handedOver) rawBytesAfterHandOver += 1;
        emit(id, { id, type: 'bytes', data: bytesBase64(chunk) });
      };

      socket.onClose = (error): void =>
        emit(id, {
          id,
          type: 'close',
          code: 1006,
          reason: '',
          error: error?.message,
        });

      return id;
    },
    listen: (id) => {
      const entry = entryOf(id);

      entry.listening = true;
      for (const event of entry.held.splice(0)) deliver(event);
    },
    write: (id, base64) => entryOf(id).socket.write(base64Bytes(base64)),
    handOver,
    send: (id, message) => entryOf(id).ws?.send(message),
    close: (id, code, reason) => {
      const entry = entryOf(id);

      if (entry.ws) entry.ws.close(code, reason);
      else entry.socket.close();
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return (): void => {
        listeners.delete(listener);
      };
    },
  };

  const closeAll = (): void => {
    for (const entry of entries.values()) entry.socket.close();
  };

  return {
    channel: new NativeChannel(module),
    messages,
    bytesAfterHandOver: () => rawBytesAfterHandOver,
    opened: () => count,
    dropSockets: closeAll,
    close: closeAll,
  };
}
