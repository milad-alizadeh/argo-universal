import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
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
  const requests = createRequests(report);

  requests.on('upgrade', upgrading(knocking, arrive, newCarriers()));

  return {
    accept: (socket, opening, proven): void => {
      knocking.set(socket, proven);
      socket.unshift(opening);
      requests.emit('connection', socket);
    },
  };
}

const newCarriers = (): WebSocketServer =>
  new WebSocketServer({ noServer: true, perMessageDeflate: false });

const notAnswered = (
  _request: IncomingMessage,
  response: ServerResponse,
): void => {
  response.writeHead(notFound).end();
};

function createRequests(
  report: (subject: string, value: string | undefined) => void,
): Server {
  const requests = createServer(notAnswered);

  requests.on('clientError', (cause, socket): void => {
    report('channel WebSocket that failed', String(cause));
    socket.destroy();
  });

  return requests;
}

type Upgrade = (request: IncomingMessage, socket: Socket, head: Buffer) => void;

function upgrading(
  knocking: WeakMap<object, () => void>,
  arrive: Arrive,
  carriers: WebSocketServer,
): Upgrade {
  return (request, socket, head): void => {
    const proven = knocking.get(socket);

    if (!proven || pathOf(request) !== channelPath)
      return void socket.destroy();
    carriers.handleUpgrade(request, socket, head, (carrier): void =>
      arrive(carrierOf(carrier, socket), proven),
    );
  };
}

const pathOf = (request: IncomingMessage): string =>
  (request.url ?? '/').split('?')[0] ?? '/';

const carrierOf = (webSocket: WebSocket, socket: Socket): ChannelCarrier =>
  Object.assign(createWebSocketStream(webSocket), {
    remoteAddress: socket.remoteAddress,
    localAddress: socket.localAddress,
  });
