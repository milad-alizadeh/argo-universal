import { PairingClaim } from '@repo/contracts';
import { productCompatibility } from '@repo/contracts/product-identity';
import type { Admission, DeviceAdmission } from '../devices/admit-device';
import type { OpenChannels } from '../devices/open-channels';
import { admitAs, type RpcIdentity } from '../rpc/identity';
import type { ChannelCarrier } from './channel-carrier';
import { ChannelSocket } from './channel-socket';
import { HandshakeBuffer, type FirstMessage } from './handshake-buffer';
import { HandshakeReply } from './handshake-reply';
import { receiveHandshake } from './handshake-responder';
import { SeenHandshakes } from './seen-handshakes';
import type { Keypair } from './x25519';

/*
 * What a Device sends before anything else, so the one port can tell a channel from the plain HTTP the Server Device's own App speaks on loopback. The leading zero byte is one no HTTP request can start with.
 */
export const channelMagic = Buffer.concat([
  Buffer.alloc(1),
  Buffer.from(productCompatibility.channelMagic),
]);

export interface ChannelDoorDeps {
  readonly staticKey: Keypair;
  readonly admission: DeviceAdmission;
  // Where each Paired Device's open channel is kept, so unpairing it can end the channel.
  readonly channels: OpenChannels;
  // Where an authenticated channel's plaintext goes: the Server's own request listener, which serves it the same tRPC it serves on loopback.
  readonly serve: (socket: ChannelSocket) => void;
  readonly report: (subject: string, value: string | undefined) => void;
}

interface Reading {
  readonly socket: ChannelCarrier;
  readonly buffer: HandshakeBuffer;
  readonly proven: () => void;
}

/*
 * The Server's side of the encrypted channel. Every Device beyond the Server Device's own App arrives here, proves which Device Key it holds, and is either given the Connection or told why it is not (ADR-0045).
 * Nothing it cannot authenticate reaches a router: a socket that fails here is closed, not passed on.
 */
export class ChannelDoor {
  private readonly seen = new SeenHandshakes();

  public constructor(private readonly deps: ChannelDoorDeps) {}

  public accept(
    socket: ChannelCarrier,
    opening: Buffer,
    proven: () => void,
  ): void {
    this.read({ socket, buffer: new HandshakeBuffer(), proven }, opening);
  }

  private read(reading: Reading, chunk: Buffer): void {
    const { socket, buffer, proven } = reading;
    const message = this.received(socket, buffer, chunk);

    if (!message) return;

    if (message === 'waiting')
      return void socket.once('data', (more: Buffer): void =>
        this.read(reading, more),
      );
    proven();
    socket.pause();
    void this.answer(socket, message).catch((cause: unknown): void =>
      this.refuseSocket(socket, cause),
    );
  }

  // A first message that is too large is refused where it stands, so the Server never waits for bytes that were claimed and will not come.
  private received(
    socket: ChannelCarrier,
    buffer: HandshakeBuffer,
    chunk: Buffer,
  ): FirstMessage | 'waiting' | undefined {
    try {
      return buffer.push(chunk) ?? 'waiting';
    } catch (cause) {
      this.refuseSocket(socket, cause);

      return undefined;
    }
  }

  private async answer(
    socket: ChannelCarrier,
    message: FirstMessage,
  ): Promise<void> {
    const received = receiveHandshake(this.deps.staticKey, message.handshake);
    const claim = PairingClaim.parse(JSON.parse(received.claim.toString()));

    const reply = new HandshakeReply(received, socket);

    const admission = this.seen.accept(received.ephemeral)
      ? await this.admit(received.deviceKey, claim, { socket, reply })
      : replayed;

    const answered = reply.welcome(admission.welcome);

    this.open({ socket, message, answered }, admission.identity);
  }

  // The address a Device knocks from is the one thing about it the Server learns before it proves anything, and what a Ticket's wrong guesses are held against.
  private admit(
    deviceKey: Buffer,
    claim: PairingClaim,
    { socket, reply }: { socket: ChannelCarrier; reply: HandshakeReply },
  ): Promise<Admission> {
    return this.deps.admission.admit(deviceKey, claim, {
      source: socket.remoteAddress ?? 'unknown',
      onAsking: () => reply.asking(),
    });
  }

  private open(
    { socket, message, answered }: AnsweredSocket,
    identity: RpcIdentity | undefined,
  ): void {
    if (!identity) return void socket.end();

    if (message.rest.length > 0) socket.unshift(message.rest);
    const channel = new ChannelSocket(socket, answered.cipher);
    admitAs(channel, identity);
    this.track(identity, channel);
    this.deps.serve(channel);
    socket.resume();
  }

  // Only a Paired Device can be unpaired, so only its channels are kept to be ended.
  private track(identity: RpcIdentity, channel: ChannelSocket): void {
    if (!identity.serverDevice)
      this.deps.channels.track(identity.deviceId, channel);
  }

  private refuseSocket(socket: ChannelCarrier, cause: unknown): void {
    this.deps.report('channel handshake', String(cause));
    socket.destroy();
  }
}

type AnsweredSocket = {
  socket: ChannelCarrier;
  message: FirstMessage;
  answered: ReturnType<ReturnType<typeof receiveHandshake>['answer']>;
};

const replayed: Admission = {
  welcome: { paired: false, refusal: 'replayed' },
};
