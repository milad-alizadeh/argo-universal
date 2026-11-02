import { connect, type Socket } from 'node:net';
import {
  PairingWelcome,
  type PairingClaim,
  type PairingRefusal,
} from '@repo/contracts';
import type { ChannelCipher } from './channel-cipher';
import { channelMagic } from './channel-door';
import { ChannelSocket } from './channel-socket';
import { FrameReader, frameRecord } from './frames';
import { startHandshake } from './handshake-initiator';
import { rawFromStoredPublicKey, type Keypair } from './x25519';

// A Server that answered, and said why this Device gets no Connection. The App draws `ticket-expired` and `ticket-spent` as an expired code.
export class PairingRefused extends Error {
  public constructor(public readonly refusal: PairingRefusal) {
    super(`The Server refused this Device: ${refusal}`);
  }
}

export interface ChannelAddress {
  readonly host: string;
  readonly port: number;
}

export interface ChannelInput {
  readonly address: ChannelAddress;
  // The Server's static public key as the QR code carried it; a Server that does not hold its private half cannot answer.
  readonly serverPublicKey: string;
  readonly deviceKey: Keypair;
  readonly claim: PairingClaim;
}

export interface OpenedChannel {
  readonly socket: ChannelSocket;
  readonly deviceId: string;
}

/*
 * The App's side of the channel over a real socket: open it, prove which Device Key this is, and get back the plaintext socket every later call travels on (ADR-0045).
 * It is the Node implementation, which the Engine's own tests and E2E connect through. What a React Native App opens its socket with is still open.
 */
export async function connectChannel(
  input: ChannelInput,
): Promise<OpenedChannel> {
  const handshake = startHandshake({
    deviceKey: input.deviceKey,
    serverPublicKey: rawFromStoredPublicKey(input.serverPublicKey),
    claim: Buffer.from(JSON.stringify(input.claim)),
  });

  const socket = await opened(input.address);
  socket.write(Buffer.concat([channelMagic, frameRecord(handshake.message)]));

  return accept(socket, handshake, await firstRecord(socket));
}

const opened = (address: ChannelAddress): Promise<Socket> =>
  new Promise<Socket>((resolve, reject): void => {
    const socket = connect(address.port, address.host, (): void =>
      resolve(socket),
    );

    socket.once('error', reject);
  });

type Records = { record: Buffer; rest: Buffer };

function firstRecord(socket: Socket): Promise<Records> {
  return new Promise<Records>((resolve, reject): void => {
    const read = recordReader(socket, resolve);

    socket.once('error', reject);
    socket.once('close', (): void =>
      reject(new Error('The Server closed the channel')),
    );
    socket.once('data', read);
  });
}

// Reads until the Server's first whole record has arrived, and hands back whatever followed it in the same chunk.
function recordReader(
  socket: Socket,
  resolve: (records: Records) => void,
): (chunk: Buffer) => void {
  const records = new FrameReader();

  const read = (chunk: Buffer): void => {
    const [record, ...rest] = records.push(chunk);

    if (record) resolve({ record, rest: Buffer.concat(rest.map(frameRecord)) });
    else socket.once('data', read);
  };

  return read;
}

function accept(
  socket: Socket,
  handshake: ReturnType<typeof startHandshake>,
  { record, rest }: Records,
): OpenedChannel {
  const accepted = handshake.accept(record);
  const welcome = PairingWelcome.parse(JSON.parse(accepted.welcome.toString()));

  if (!welcome.paired) return refuse(socket, welcome.refusal);

  return {
    socket: resumed(socket, rest, accepted.cipher),
    deviceId: welcome.deviceId,
  };
}

function refuse(socket: Socket, refusal: PairingRefusal): never {
  socket.destroy();

  throw new PairingRefused(refusal);
}

function resumed(
  socket: Socket,
  rest: Buffer,
  cipher: ChannelCipher,
): ChannelSocket {
  socket.pause();

  if (rest.length > 0) socket.unshift(rest);
  const channel = new ChannelSocket(socket, cipher);
  socket.resume();

  return channel;
}
