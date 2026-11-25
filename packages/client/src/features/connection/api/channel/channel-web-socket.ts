import { bytesText, concatBytes, bytesBase64, textBytes } from './bytes';
import { ServerUnreachable } from './channel-route';
import { abnormalClosure, normalClosure } from './close-codes';
import { readHead, type HeadAndRest } from './http-exchange';
import { PairingRefused, type OpenedChannel } from './open-channel';
import { EventedSocket } from './socket-events';
import {
  encodeClientFrame,
  FrameParser,
  opcodes,
  type WebSocketFrame,
} from './ws-frames';
import { acceptFor, upgraded, upgradeRequest } from './ws-upgrade';

const byteShift = 8;

const byteMask = 0xff;

const maskBytes = 4;

const keyBytes = 16;

export interface ChannelSocketDeps {
  readonly openChannel: () => Promise<OpenedChannel>;
  readonly randomBytes: (length: number) => Uint8Array;
  // The Server answered and does not know this Device's key: it was unpaired there. Reconnecting would only be refused again.
  readonly onRefused?: () => void;
}

const closeBody = (code: number, reason: string): Uint8Array =>
  concatBytes(
    Uint8Array.of(code >> byteShift, code & byteMask),
    textBytes(reason),
  );

const noCloseFrame = 1005;

function closeCode(payload: Uint8Array): number {
  if (payload.length < 2) return noCloseFrame;

  const [high = 0, low = 0] = payload;

  return (high << byteShift) | low;
}

/*
 * The slice of the browser's WebSocket that tRPC's client uses, speaking RFC 6455 to the Server inside an open channel. tRPC runs over it exactly as it runs over `ws://`, so nothing on the Server or in tRPC knows the difference (ADR-0045).
 * Each instance opens its own channel, so tRPC's reconnect is a new handshake with the same Device Key.
 */
class ChannelWebSocket extends EventedSocket {
  private channel: OpenedChannel | undefined;
  private readonly frames = new FrameParser();
  private head: Uint8Array = new Uint8Array(0);
  private accept = '';
  private message: Uint8Array[] = [];
  private readonly control = new Map<number, (payload: Uint8Array) => void>([
    [opcodes.ping, (payload): void => this.frame(opcodes.pong, payload)],
    [opcodes.pong, (): void => {}],
    [opcodes.close, (payload): void => this.remoteClose(payload)],
  ]);

  public constructor(
    private readonly deps: ChannelSocketDeps,
    private readonly path: string,
  ) {
    super();
    deps.openChannel().then(
      (channel) => this.start(channel),
      (cause: unknown) => this.fail(cause),
    );
  }

  public send(text: string): void {
    if (this.readyState !== WebSocket.OPEN)
      throw new Error('The channel is not open');
    this.frame(opcodes.text, textBytes(text));
  }

  public close(code = normalClosure, reason = ''): void {
    if (this.readyState >= WebSocket.CLOSING) return;
    this.readyState = WebSocket.CLOSING;
    this.frame(opcodes.close, closeBody(code, reason));
    this.shutdown(code, reason);
  }

  private remoteClose(payload: Uint8Array): void {
    this.readyState = WebSocket.CLOSING;
    this.frame(opcodes.close, payload);
    this.shutdown(closeCode(payload), bytesText(payload.subarray(2)));
  }

  private shutdown(code: number, reason = ''): void {
    this.finish(code, reason);
    this.channel?.stream.close();
  }

  private start(channel: OpenedChannel): void {
    if (this.readyState !== WebSocket.CONNECTING) return channel.stream.close();
    const key = bytesBase64(this.deps.randomBytes(keyBytes));

    this.channel = channel;
    this.accept = acceptFor(key);
    channel.stream.listen({
      onData: (chunk) => this.receive(chunk),
      onClose: () => this.finish(abnormalClosure),
    });
    channel.stream.write(textBytes(upgradeRequest(this.path, key)));
  }

  private receive(chunk: Uint8Array): void {
    if (this.readyState === WebSocket.OPEN) this.parse(chunk);
    else if (this.readyState === WebSocket.CONNECTING) this.awaitUpgrade(chunk);
  }

  private awaitUpgrade(chunk: Uint8Array): void {
    this.head = concatBytes(this.head, chunk);
    const read = readHead(this.head);

    if (read) this.answered(read);
  }

  private answered({ head, rest }: HeadAndRest): void {
    if (!upgraded(head, this.accept))
      return this.fail(
        new Error(`The Server refused the upgrade (${head.status})`),
      );
    this.readyState = WebSocket.OPEN;
    this.emit('open', {});
    this.parse(rest);
  }

  private parse(chunk: Uint8Array): void {
    for (const frame of this.frames.push(chunk)) this.handle(frame);
  }

  private handle({ fin, opcode, payload }: WebSocketFrame): void {
    const control = this.control.get(opcode);

    if (control) control(payload);
    else this.collect(fin, payload);
  }

  // Text and binary frames, possibly split over several, are one message to tRPC.
  private collect(fin: boolean, payload: Uint8Array): void {
    this.message.push(payload);

    if (!fin) return;
    this.emit('message', { data: bytesText(concatBytes(...this.message)) });
    this.message = [];
  }

  private frame(opcode: number, payload: Uint8Array): void {
    this.channel?.stream.write(
      encodeClientFrame(opcode, payload, this.deps.randomBytes(maskBytes)),
    );
  }

  private fail(cause: unknown): void {
    if (isUnknownDevice(cause)) this.deps.onRefused?.();
    else reportFault(cause);
    this.emit('error', {});
    this.shutdown(abnormalClosure);
  }
}

// A Server that is off or away is drawn by the Connection as reconnecting, as an unpaired Device is drawn as not allowed; only anything else is a fault worth the error overlay.
export function reportFault(cause: unknown): void {
  if (cause instanceof ServerUnreachable) return;
  console.error('The channel to the Server failed', cause);
}

// A Device with a row and a key does not meet this: the Server asks for a Ticket only of a Device it has no row for.
export const isUnknownDevice = (cause: unknown): boolean =>
  cause instanceof PairingRefused && cause.refusal === 'ticket-required';

const pathOf = (url: string): string =>
  url.replace(/^wss?:\/\/[^/?]+/, '') || '/';

/*
 * The constructor tRPC's client is given, in place of the platform's WebSocket: it keeps the platform's constants (`OPEN` and the rest) and answers `new` with a socket that runs inside the channel.
 */
export const channelWebSocket = (deps: ChannelSocketDeps): typeof WebSocket =>
  new Proxy(WebSocket, {
    construct: (_socket, [url]) =>
      new ChannelWebSocket(deps, pathOf(String(url))),
  });
