import { channelPath } from '@repo/contracts';
import type { ByteSocket, ChannelAddress } from './byte-socket';

// A Server on the local network answers in milliseconds; one that has not in this long is not at that address, and the next one is tried. The platform's own wait is over a minute.
export const connectTimeoutMs = 4000;

type Message = ArrayBuffer | string;

const bytesOf = (data: Message): Uint8Array =>
  typeof data === 'string'
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);

const bracketedIfIPv6 = (host: string): string =>
  host.includes(':') ? `[${host}]` : host;

export const channelUrl = ({ host, port }: ChannelAddress): string =>
  `ws://${bracketedIfIPv6(host)}:${port}${channelPath}`;

function adapter(webSocket: WebSocket): ByteSocket {
  const bytes: ByteSocket = {
    write: (data) => webSocket.send(data),
    close: () => webSocket.close(),
    onData: () => {},
    onClose: () => {},
  };

  webSocket.onmessage = (event): void => bytes.onData(bytesOf(event.data));
  webSocket.onclose = (): void => bytes.onClose();
  webSocket.onerror = (): void => bytes.onClose(new Error('channel closed'));

  return bytes;
}

type Settle = Pick<PromiseWithResolvers<ByteSocket>, 'resolve' | 'reject'>;

function giveUpAfterTimeout(
  webSocket: WebSocket,
  url: string,
  settle: Settle,
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    webSocket.close();
    settle.reject(new Error(`No answer at ${url}`));
  }, connectTimeoutMs);
}

/*
 * The channel's bytes over a WebSocket at the Server's channel path (ADR-0045). The WebSocket only carries; the Noise handshake inside it proves the Server.
 */
export function openWebSocketCarrier(
  address: ChannelAddress,
): Promise<ByteSocket> {
  const opening = Promise.withResolvers<ByteSocket>();
  const url = channelUrl(address);
  const webSocket = new WebSocket(url);

  webSocket.binaryType = 'arraybuffer';
  settleWhenOpen(webSocket, url, opening);

  return opening.promise;
}

function settleWhenOpen(
  webSocket: WebSocket,
  url: string,
  opening: Settle,
): void {
  const timeout = giveUpAfterTimeout(webSocket, url, opening);

  webSocket.onopen = (): void => {
    clearTimeout(timeout);
    opening.resolve(adapter(webSocket));
  };

  webSocket.onerror = (): void => {
    clearTimeout(timeout);
    opening.reject(new Error(`Could not open ${url}`));
  };
}
