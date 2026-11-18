import { channelPath } from '@repo/contracts';
import type { ByteSocket, ChannelAddress } from './byte-socket';

// A Server on the local network answers in milliseconds; one that has not in this long is not at that address, and the next one is tried. The platform's own wait is over a minute.
export const connectTimeoutMs = 4000;

const bytesOf = (data: unknown): Uint8Array =>
  data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : new TextEncoder().encode(String(data));

export const channelUrl = ({ host, port }: ChannelAddress): string =>
  `ws://${host.includes(':') ? `[${host}]` : host}:${port}${channelPath}`;

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

/*
 * The channel's bytes over a WebSocket at the Server's channel path, as an Expo dev server is reached: a URL, so the same channel crosses a tailnet or anything else that carries HTTP (ADR-0045).
 * The WebSocket only carries; the Noise handshake inside it is what proves the Server, so nothing here is trusted for being on this network.
 */
export const openWebSocketCarrier = (
  address: ChannelAddress,
): Promise<ByteSocket> =>
  new Promise((resolve, reject) => {
    const webSocket = new WebSocket(channelUrl(address));
    const timeout = setTimeout(() => {
      webSocket.close();
      reject(new Error(`No answer at ${channelUrl(address)}`));
    }, connectTimeoutMs);

    webSocket.binaryType = 'arraybuffer';
    webSocket.onopen = (): void => {
      clearTimeout(timeout);
      resolve(adapter(webSocket));
    };
    webSocket.onerror = (): void => {
      clearTimeout(timeout);
      reject(new Error(`Could not open ${channelUrl(address)}`));
    };
  });
