import type { Server as RequestServer } from 'node:http';
import { createServer, type Server, type Socket } from 'node:net';
import { channelMagic } from '../pairing/channel-door';
import { admitAs, serverDeviceIdentity } from '../rpc/identity';
import { isLoopback } from './network-listener';

export interface ChannelDoorPort {
  readonly accept: (socket: Socket, opening: Buffer) => void;
}

export interface FrontDoorDeps {
  // The Server's own request listener, which serves tRPC, Blobs and Plugin assets to whatever is admitted.
  readonly requests: RequestServer;
  readonly channel: ChannelDoorPort;
  readonly report: (subject: string, value: string | undefined) => void;
}

/*
 * The one door into the Server, and the only place that decides who may knock (ADR-0002 as ADR-0045 amends it).
 * A socket that opens with the channel's first bytes goes to the handshake and is admitted as whichever Device it proves to be. Anything else is plain HTTP, which only this computer's own App speaks, on loopback, as the Server Device.
 * So a Device on the local network reaches no router, no Blob and no Plugin asset without the handshake, and there is no plain-HTTP side door beside it.
 */
export const createFrontDoor = (deps: FrontDoorDeps): Server =>
  createServer((socket): void => peek(deps, socket, Buffer.alloc(0)));

function peek(deps: FrontDoorDeps, socket: Socket, received: Buffer): void {
  const chunk: unknown = socket.read();

  const opening = Buffer.isBuffer(chunk)
    ? Buffer.concat([received, chunk])
    : received;

  if (opening.length >= channelMagic.length)
    return admit(deps, socket, opening);
  socket.once('readable', (): void => peek(deps, socket, opening));
}

function admit(deps: FrontDoorDeps, socket: Socket, opening: Buffer): void {
  if (opening.subarray(0, channelMagic.length).equals(channelMagic))
    return deps.channel.accept(socket, opening.subarray(channelMagic.length));

  if (!isLoopback(socket.remoteAddress)) return refuse(deps, socket);
  socket.unshift(opening);
  admitAs(socket, serverDeviceIdentity);
  deps.requests.emit('connection', socket);
}

// A Device on the local network that speaks plain HTTP has proved nothing, so it is not answered at all.
function refuse(deps: FrontDoorDeps, socket: Socket): void {
  deps.report('unauthenticated Connection', socket.remoteAddress);
  socket.destroy();
}
