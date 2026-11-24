import type { Duplex } from 'node:stream';
import { channelCompressionHeader, channelPath } from '@repo/contracts';
import { createWebSocketStream, WebSocket } from 'ws';
import type { ChannelAddress } from '../src/pairing/connect-channel';

export interface WebSocketCarrier {
  open: (address: ChannelAddress) => Promise<Duplex>;
  // What has crossed the TCP socket under the WebSocket, as the network would carry it.
  wireBytesRead: () => number;
}

// What an App that can inflate puts on the upgrade (ADR-0045).
export const compressionOffer = {
  [channelCompressionHeader]: 'deflate-raw',
};

/*
 * The channel carried by a WebSocket at the channel path, as a phone opens it. `headers` are what its upgrade carries: the compression offer, or whatever a test wants a Server to see.
 */
export function webSocketCarrier(
  headers: Record<string, string> = {},
): WebSocketCarrier {
  let tcp: { bytesRead: number } | undefined;

  return {
    wireBytesRead: (): number => tcp?.bytesRead ?? 0,
    open: (address) =>
      new Promise<Duplex>((resolve, reject): void => {
        const socket = new WebSocket(
          `ws://${address.host}:${address.port}${channelPath}`,
          { headers },
        );

        socket.once('upgrade', (response): void => {
          tcp = response.socket;
        });
        socket.once('error', reject);
        socket.once('open', (): void => resolve(createWebSocketStream(socket)));
      }),
  };
}
