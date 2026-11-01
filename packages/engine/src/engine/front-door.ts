import type { Server as RequestServer } from 'node:http';
import { createServer, type Server, type Socket } from 'node:net';
import { channelMagic } from '../pairing/channel-door';
import { keyMagic } from '../pairing/key-offer';
import { isLoopback } from './network-listener';
import type { SocketGuard } from './socket-guard';

export interface ChannelDoorPort {
  // `proven` is for the channel to call once the socket's first handshake message has all arrived, which is when the door stops timing it.
  readonly accept: (
    socket: Socket,
    opening: Buffer,
    proven: () => void,
  ) => void;
}

export interface FrontDoorDeps {
  // The Server's own request listener, which serves tRPC, Blobs and Plugin assets to whatever is admitted.
  readonly requests: RequestServer;
  readonly channel: ChannelDoorPort;
  // A Device typed a Pairing Ticket and asks for the Server's key with it (ADR-0045).
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
export const createFrontDoor = (deps: FrontDoorDeps): Server =>
  createServer((socket): void => knock(deps, socket));

/*
 * The socket's own errors are this door's to handle, from before the first byte of it is read.
 * A raw socket with no `'error'` listener raises an uncaught exception when its peer resets the connection, and that ends the whole Server. Resetting a connection takes no Pairing Ticket and no knowledge of the Server's static key, so until this listener is attached, anyone who can reach the port can stop Argo.
 */
function knock(deps: FrontDoorDeps, socket: Socket): void {
  socket.on('error', (cause: Error): void => broke(deps, socket, cause));
  const proven = deps.unproven.hold(socket);

  if (proven) peek({ deps, socket, proven }, Buffer.alloc(0));
}

// Whatever went wrong with the socket, there is nothing left to answer on it.
function broke(deps: FrontDoorDeps, socket: Socket, cause: Error): void {
  deps.report('Connection that failed', String(cause));
  socket.destroy();
}

type Knocking = {
  deps: FrontDoorDeps;
  socket: Socket;
  proven: () => void;
};

function peek(knocking: Knocking, received: Buffer): void {
  const { socket } = knocking;
  const chunk: unknown = socket.read();

  const opening = Buffer.isBuffer(chunk)
    ? Buffer.concat([received, chunk])
    : received;

  if (opening.length >= channelMagic.length) return admit(knocking, opening);
  socket.once('readable', (): void => peek(knocking, opening));
}

function admit({ deps, socket, proven }: Knocking, opening: Buffer): void {
  const named = nameOf(opening);

  if (named)
    return deps[named].accept(
      socket,
      opening.subarray(channelMagic.length),
      proven,
    );

  if (!isLoopback(socket.remoteAddress)) return refuse(deps, socket);
  proven();
  socket.unshift(opening);
  deps.requests.emit('connection', socket);
}

const nameOf = (opening: Buffer): 'channel' | 'key' | undefined => {
  const first = opening.subarray(0, channelMagic.length);

  if (first.equals(channelMagic)) return 'channel';

  return first.equals(keyMagic) ? 'key' : undefined;
};

// A Device on the local network that speaks plain HTTP has proved nothing, so it is not answered at all.
function refuse(deps: FrontDoorDeps, socket: Socket): void {
  deps.report('unauthenticated Connection', socket.remoteAddress);
  socket.destroy();
}
