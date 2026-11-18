import { createServer, type IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import { channelPath } from '@repo/contracts';
import { createWebSocketStream, type WebSocket, WebSocketServer } from 'ws';
import type { ChannelCarrier } from '../pairing/channel-carrier';

// The request line a channel's WebSocket opens with, which no other request on this port starts with.
const carrierRequest = Buffer.from(`GET ${channelPath} `);

export const carrierOpeningLength = carrierRequest.length;

export const opensCarrier = (opening: Buffer): boolean =>
  opening.subarray(0, carrierRequest.length).equals(carrierRequest);

export interface CarrierDoor {
  readonly accept: (
    socket: ChannelCarrier,
    opening: Buffer,
    proven: () => void,
  ) => void;
}

type Arrive = (carrier: ChannelCarrier, proven: () => void) => void;

const notFound = 404;

/*
 * A channel that arrives as a WebSocket at the channel path, the way a phone opens it and the way it crosses a tailnet or anything else that carries HTTP (ADR-0045).
 * The upgrade proves nothing and asks for nothing: the WebSocket only carries the channel's bytes, and the handshake inside it is still the gate every Device passes. Any other request here is not answered.
 */
export function createCarrierDoor(
  arrive: Arrive,
  report: (subject: string, value: string | undefined) => void,
): CarrierDoor {
  const knocking = new WeakMap<object, () => void>();
  const carriers = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
  });

  const requests = createServer((_request, response): void => {
    response.writeHead(notFound).end();
  });

  requests.on('clientError', (cause, socket): void => {
    report('channel WebSocket that failed', String(cause));
    socket.destroy();
  });

  requests.on(
    'upgrade',
    (request: IncomingMessage, socket: Socket, head: Buffer): void => {
      const proven = knocking.get(socket);

      if (!proven || pathOf(request) !== channelPath)
        return void socket.destroy();
      carriers.handleUpgrade(request, socket, head, (webSocket): void =>
        arrive(carrierOf(webSocket, socket), proven),
      );
    },
  );

  return {
    accept: (socket, opening, proven): void => {
      knocking.set(socket, proven);
      socket.unshift(opening);
      requests.emit('connection', socket);
    },
  };
}

const pathOf = (request: IncomingMessage): string =>
  new URL(request.url ?? '/', 'http://channel').pathname;

// The WebSocket's messages as one stream of bytes, knocking from where the socket under it did.
const carrierOf = (webSocket: WebSocket, socket: Socket): ChannelCarrier =>
  Object.assign(createWebSocketStream(webSocket), {
    remoteAddress: socket.remoteAddress,
    localAddress: socket.localAddress,
  });
