import { bytesBase64 } from './bytes';
import { isUnknownDevice, reportFault } from './channel-web-socket';
import type { ChannelSocketDeps } from './channel-web-socket';
import {
  NativeByteSocket,
  type NativeChannel,
  type NativeChannelEvent,
} from './native-channel';
import type { HandOver } from './secure-stream';
import { EventedSocket } from './socket-events';
import { acceptFor, upgradeRequest } from './ws-upgrade';

const normalClosure = 1000;

const abnormalClosure = 1006;

const keyBytes = 16;

export interface NativeSocketDeps extends ChannelSocketDeps {
  readonly native: NativeChannel;
}

/*
 * The same slice of the browser's WebSocket as `channelWebSocket`, with the channel carried by the native module: JavaScript runs the handshake, hands the keys over, and from then on every message is one string, with no base64 and no decryption in JavaScript.
 */
class NativeChannelWebSocket extends EventedSocket {
  private id: string | undefined;

  public constructor(
    private readonly deps: NativeSocketDeps,
    private readonly path: string,
  ) {
    super();
    deps.openChannel().then(
      (channel) => this.start(channel.stream.handOver()),
      (cause: unknown) => this.fail(cause),
    );
  }

  public send(text: string): void {
    if (this.readyState !== WebSocket.OPEN || this.id === undefined)
      throw new Error('The channel is not open');
    this.deps.native.native.send(this.id, text);
  }

  public close(code = normalClosure, reason = ''): void {
    if (this.readyState >= WebSocket.CLOSING) return;
    this.readyState = WebSocket.CLOSING;
    this.release(code, reason);
    this.finish(code, reason);
  }

  private start({ socket, sending, receiving }: HandOver): void {
    if (!(socket instanceof NativeByteSocket)) {
      socket.close();

      return this.fail(new Error('The channel is not carried by the module'));
    }

    const { id } = socket;

    if (this.readyState !== WebSocket.CONNECTING)
      return this.deps.native.native.close(id, normalClosure, '');
    const key = bytesBase64(this.deps.randomBytes(keyBytes));

    this.id = id;
    this.deps.native.watch(id, (event) => this.heard(event));

    this.deps.native.native.handOver(id, {
      sendKey: bytesBase64(sending.key),
      sendRecords: sending.records,
      receiveKey: bytesBase64(receiving.key),
      receiveRecords: receiving.records,
      upgrade: upgradeRequest(this.path, key),
      accept: acceptFor(key),
    });
  }

  private heard(event: NativeChannelEvent): void {
    switch (event.type) {
      case 'open':
        return this.opened();
      case 'message':
        return this.emit('message', { data: event.data });
      case 'close':
        return this.closed(event);
      default:
    }
  }

  private opened(): void {
    if (this.readyState !== WebSocket.CONNECTING) return;

    this.readyState = WebSocket.OPEN;
    this.emit('open', {});
  }

  private closed(event: Extract<NativeChannelEvent, { type: 'close' }>): void {
    if (this.id !== undefined) this.deps.native.forget(this.id);

    if (this.readyState === WebSocket.CONNECTING) this.emit('error', {});

    this.finish(event.code, event.reason);
  }

  // Tells the module to send the close frame and drop the socket, and stops listening to it.
  private release(code: number, reason: string): void {
    if (this.id === undefined) return;
    this.deps.native.forget(this.id);
    this.deps.native.native.close(this.id, code, reason);
  }

  private fail(cause: unknown): void {
    if (isUnknownDevice(cause)) this.deps.onRefused?.();
    else reportFault(cause);
    this.emit('error', {});
    this.release(abnormalClosure, '');
    this.finish(abnormalClosure);
  }
}

const pathOf = (url: string): string =>
  url.replace(/^wss?:\/\/[^/?]+/, '') || '/';

export const nativeChannelWebSocket = (
  deps: NativeSocketDeps,
): typeof WebSocket =>
  new Proxy(WebSocket, {
    construct: (_socket, [url]) =>
      new NativeChannelWebSocket(deps, pathOf(String(url))),
  });
