import type { Socket } from 'node:net';
import { PairingClaim } from '@repo/contracts';
import type { Admission, DeviceAdmission } from '../devices/admit-device';
import { admitAs, type RpcIdentity } from '../rpc/identity';
import { ChannelSocket } from './channel-socket';
import { frameRecord } from './frames';
import { receiveHandshake } from './handshake-responder';
import { SeenHandshakes } from './seen-handshakes';
import type { Keypair } from './x25519';

/*
 * What a Device sends before anything else, so the one port can tell a channel from the plain HTTP the Server Device's own App speaks on loopback. The leading zero byte is one no HTTP request can start with.
 */
export const channelMagic = Buffer.concat([
  Buffer.alloc(1),
  Buffer.from('ARGO'),
]);

export interface ChannelDoorDeps {
  readonly staticKey: Keypair;
  readonly admission: DeviceAdmission;
  // Where an authenticated channel's plaintext goes: the Server's own request listener, which serves it the same tRPC it serves on loopback.
  readonly serve: (socket: ChannelSocket) => void;
  readonly report: (subject: string, value: string | undefined) => void;
}

/*
 * The Server's side of the encrypted channel. Every Device beyond the Server Device's own App arrives here, proves which Device Key it holds, and is either given the Connection or told why it is not (ADR-0045).
 * Nothing it cannot authenticate reaches a router: a socket that fails here is closed, not passed on.
 */
export class ChannelDoor {
  private readonly seen = new SeenHandshakes();

  public constructor(private readonly deps: ChannelDoorDeps) {}

  public accept(socket: Socket, opening: Buffer): void {
    const received: Buffer[] = [opening];

    const read = (chunk: Buffer): void => {
      received.push(chunk);
      void this.shakeHands(socket, Buffer.concat(received), read);
    };

    read(Buffer.alloc(0));
  }

  private async shakeHands(
    socket: Socket,
    received: Buffer,
    read: (chunk: Buffer) => void,
  ): Promise<void> {
    const message = firstMessage(received);

    if (!message) return void socket.once('data', read);
    socket.pause();
    await this.answer(socket, message).catch((cause: unknown): void =>
      this.refuseSocket(socket, cause),
    );
  }

  private async answer(socket: Socket, message: FirstMessage): Promise<void> {
    const received = receiveHandshake(this.deps.staticKey, message.handshake);
    const claim = PairingClaim.parse(JSON.parse(received.claim.toString()));

    const admission = this.seen.accept(received.ephemeral)
      ? await this.deps.admission.admit(received.deviceKey, claim)
      : replayed;

    const answered = received.answer(
      Buffer.from(JSON.stringify(admission.welcome)),
    );

    socket.write(frameRecord(answered.message));
    this.open({ socket, message, answered }, admission.identity);
  }

  private open(
    { socket, message, answered }: AnsweredSocket,
    identity: RpcIdentity | undefined,
  ): void {
    if (!identity) return void socket.end();

    if (message.rest.length > 0) socket.unshift(message.rest);
    const channel = new ChannelSocket(socket, answered.cipher);
    admitAs(channel, identity);
    this.deps.serve(channel);
    socket.resume();
  }

  private refuseSocket(socket: Socket, cause: unknown): void {
    this.deps.report('channel handshake', String(cause));
    socket.destroy();
  }
}

type AnsweredSocket = {
  socket: Socket;
  message: FirstMessage;
  answered: ReturnType<ReturnType<typeof receiveHandshake>['answer']>;
};

const replayed: Admission = {
  welcome: { paired: false, refusal: 'replayed' },
};

type FirstMessage = { handshake: Buffer; rest: Buffer };

const headerBytes = 2;

// The handshake message, once all of it has arrived; whatever follows it is the first of the channel's records.
function firstMessage(received: Buffer): FirstMessage | undefined {
  if (received.length < headerBytes) return undefined;
  const length = received.readUInt16BE(0);

  if (received.length < headerBytes + length) return undefined;

  return {
    handshake: received.subarray(headerBytes, headerBytes + length),
    rest: received.subarray(headerBytes + length),
  };
}
