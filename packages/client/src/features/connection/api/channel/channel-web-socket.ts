import { bytesText, concatBytes, bytesBase64, textBytes } from './bytes';
import { readHead, type HeadAndRest } from './http-exchange';
import { PairingRefused, type OpenedChannel } from './open-channel';
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

const normalClosure = 1000;

const abnormalClosure = 1006;

type Listener = (event: { data?: string; code?: number }) => void;

export interface ChannelSocketDeps {
  readonly openChannel: () => Promise<OpenedChannel>;
  readonly randomBytes: (length: number) => Uint8Array;
  // The Server answered and does not know this Device's key: it was unpaired there. Reconnecting would only be refused again.
  readonly onRefused?: () => void;
}

const closeBody = (code: number): Uint8Array =>
  Uint8Array.of(code >> byteShift, code & byteMask);

/*
 * The slice of the browser's WebSocket that tRPC's client uses, speaking RFC 6455 to the Server inside an open channel. tRPC runs over it exactly as it runs over `ws://`, so nothing on the Server or in tRPC knows the difference (ADR-0045).
 * Each instance opens its own channel, so tRPC's reconnect is a new handshake with the same Device Key.
 */
export class ChannelWebSocket {
  public readyState: number = WebSocket.CONNECTING;
  public binaryType = 'arraybuffer';
  private readonly listeners = new Map<string, Set<Listener>>();
  private channel: OpenedChannel | undefined;
  private readonly frames = new FrameParser();
  private head: Uint8Array = new Uint8Array(0);
  private accept = '';
  private message: Uint8Array[] = [];
  private readonly control = new Map<number, (payload: Uint8Array) => void>([
    [opcodes.ping, (payload): void => this.frame(opcodes.pong, payload)],
    [opcodes.pong, (): void => {}],
    [opcodes.close, (): void => this.close()],
  ]);

  public constructor(
    private readonly deps: ChannelSocketDeps,
    private readonly path: string,
  ) {
    deps.openChannel().then(
      (channel) => this.start(channel),
      (cause: unknown) => this.fail(cause),
    );
  }

  public addEventListener(type: string, listener: Listener): void {
    const set = this.listeners.get(type) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  public removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  public send(text: string): void {
    if (this.readyState !== WebSocket.OPEN)
      throw new Error('The channel is not open');
    this.frame(opcodes.text, textBytes(text));
  }

  public close(code = normalClosure): void {
    if (this.readyState >= WebSocket.CLOSING) return;
    this.readyState = WebSocket.CLOSING;
    this.frame(opcodes.close, closeBody(code));
    this.shutdown(code);
  }

  private shutdown(code: number): void {
    this.channel?.stream.close();
    this.finish(code);
  }

  private start(channel: OpenedChannel): void {
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
    else this.awaitUpgrade(chunk);
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
    console.error('The channel to the Server failed', cause);
    this.emit('error', {});
    this.shutdown(abnormalClosure);
  }

  private finish(code: number): void {
    if (this.readyState === WebSocket.CLOSED) return;
    this.readyState = WebSocket.CLOSED;
    this.emit('close', { code });
  }

  private emit(type: string, event: Parameters<Listener>[0]): void {
    for (const listener of this.listeners.get(type) ?? [])
      listener.call(this, event);
  }
}

// A Device with a row and a key does not meet this: the Server asks for a Ticket only of a Device it has no row for.
const isUnknownDevice = (cause: unknown): boolean =>
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
