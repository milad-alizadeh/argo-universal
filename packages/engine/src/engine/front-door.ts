import type { Server as RequestServer } from 'node:http';
import { createServer, type Server, type Socket } from 'node:net';
import { pakeMagic } from '@repo/contracts/pake';
import type { ChannelCarrier } from '../pairing/channel-carrier';
import { channelMagic } from '../pairing/channel-door';
import {
  carrierOpeningLength,
  createCarrierDoor,
  opensCarrier,
} from './channel-carrier-door';
import { isLoopback } from './network-listener';
import type { SocketGuard } from './socket-guard';

interface ChannelDoorPort {
  // `proven` is for the channel to call once the socket's first handshake message has all arrived, which is when the door stops timing it.
  readonly accept: (
    socket: ChannelCarrier,
    opening: Buffer,
    proven: () => void,
  ) => void;
}

export interface FrontDoorDeps {
  // The Server's own request listener, which serves tRPC, Blobs and Plugin assets to whatever is admitted.
  readonly requests: RequestServer;
  readonly channel: ChannelDoorPort;
  // A Device typed a Pairing Ticket and runs a password-authenticated key exchange keyed by it to be given the Server's key (ADR-0045).
  readonly key: ChannelDoorPort;
  // Times and counts the sockets that have not yet said what they are, so one that says nothing cannot sit there for good.
  readonly unproven: SocketGuard;
  readonly report: (subject: string, value: string | undefined) => void;
}

/*
 * The one door into the Server, and the only place that decides who may knock (ADR-0002 as ADR-0045 amends it).
 * A socket that opens with the channel's first bytes goes to the handshake and is admitted as whichever Device it proves to be. Anything else is plain HTTP, which only this computer's own App and tooling speak, and only on loopback.
 * Arriving on loopback is not itself a proof, because a web page on a name that resolves to this computer arrives there too, so a plain-HTTP socket is admitted as nothing: each request on it proves the Server Device for itself (#1696).
 * So a Device on the local network reaches no router, no Blob and no Plugin asset without the handshake, and there is no plain-HTTP side door beside it.
 */
export function createFrontDoor(deps: FrontDoorDeps): Server {
  const carried = createCarrierDoor(
    (carrier, proven): void =>
      peek({ deps, socket: carrier, proven, plain: refuse }, Buffer.alloc(0)),
    deps.report,
  );

  const plain: Plain = (knocking, opening) =>
    opensCarrier(opening)
      ? carried.accept(knocking.socket, opening, knocking.proven)
      : loopbackOnly(knocking, opening);

  return createServer((socket): void => knock({ deps, plain }, socket));
}

/*
 * The socket's own errors are this door's to handle, from before the first byte of it is read.
 * A raw socket with no `'error'` listener raises an uncaught exception when its peer resets the connection, and that ends the whole Server. Resetting a connection takes no Pairing Ticket and no knowledge of the Server's static key, so until this listener is attached, anyone who can reach the port can stop Argo.
 */
function knock(
  { deps, plain }: { deps: FrontDoorDeps; plain: Plain },
  socket: Socket,
): void {
  socket.on('error', (cause: Error): void => broke(deps, socket, cause));
  const proven = deps.unproven.hold(socket);

  if (proven) peek({ deps, socket, proven, plain }, Buffer.alloc(0));
}

// Whatever went wrong with the socket, there is nothing left to answer on it.
function broke(deps: FrontDoorDeps, socket: Socket, cause: Error): void {
  deps.report('Connection that failed', String(cause));
  socket.destroy();
}

type Knocking = {
  deps: FrontDoorDeps;
  socket: ChannelCarrier;
  proven: () => void;
  // What a socket that does not open with a channel's first bytes gets.
  plain: Plain;
};

type Plain = (knocking: Knocking, opening: Buffer) => void;

// Enough bytes to tell a channel, a typed code's ask and a channel's WebSocket apart; every HTTP request line is longer.
const openingLength = Math.max(channelMagic.length, carrierOpeningLength);

// What has arrived so far, with whatever the socket holds now.
function joined(socket: ChannelCarrier, received: Buffer): Buffer {
  const chunk: unknown = socket.read();

  return Buffer.isBuffer(chunk) ? Buffer.concat([received, chunk]) : received;
}

// A channel or a typed code's ask is known by its first bytes; anything else waits until a WebSocket's request line could be read.
const isTold = (opening: Buffer): boolean =>
  Boolean(nameOf(opening)) || opening.length >= openingLength;

function peek(knocking: Knocking, received: Buffer): void {
  const opening = joined(knocking.socket, received);

  if (isTold(opening)) return admit(knocking, opening);
  knocking.socket.once('readable', (): void => peek(knocking, opening));
}

function admit(knocking: Knocking, opening: Buffer): void {
  const { deps, socket, proven } = knocking;
  const named = nameOf(opening);

  if (!named) return knocking.plain(knocking, opening);
  deps[named].accept(socket, opening.subarray(channelMagic.length), proven);
}

// Plain HTTP is this computer's own App and tooling, on loopback only.
function loopbackOnly(
  { deps, socket, proven }: Knocking,
  opening: Buffer,
): void {
  if (!isLoopback(socket.remoteAddress)) return refuse({ deps, socket });
  proven();
  socket.unshift(opening);
  deps.requests.emit('connection', socket);
}

// What a Device that holds only a typed code opens with.
const keyMagic = Buffer.from(pakeMagic);

const nameOf = (opening: Buffer): 'channel' | 'key' | undefined => {
  const first = opening.subarray(0, channelMagic.length);

  if (first.equals(channelMagic)) return 'channel';

  return first.equals(keyMagic) ? 'key' : undefined;
};

// A Device on the local network that speaks plain HTTP has proved nothing, so it is not answered at all.
function refuse({ deps, socket }: Pick<Knocking, 'deps' | 'socket'>): void {
  deps.report('unauthenticated Connection', socket.remoteAddress);
  socket.destroy();
}
