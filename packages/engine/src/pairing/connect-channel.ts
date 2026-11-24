import { connect } from 'node:net';
import type { Duplex } from 'node:stream';
import {
  PairingAnswer,
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
  // Called when the Server says the request is with the owner, before the owner answers.
  readonly onAsked?: () => void;
  // What carries the channel's bytes. A raw TCP socket unless a test gives another, such as a WebSocket that offers compression in its upgrade headers.
  readonly carrier?: (address: ChannelAddress) => Promise<Duplex>;
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

  const socket = input.carrier
    ? await input.carrier(input.address)
    : await opened(input.address);

  socket.write(Buffer.concat([channelMagic, frameRecord(handshake.message)]));

  return accept({ socket, handshake, input }, await firstRecord(socket));
}

const opened = (address: ChannelAddress): Promise<Duplex> =>
  new Promise<Duplex>((resolve, reject): void => {
    const socket = connect(address.port, address.host, (): void =>
      resolve(socket),
    );

    socket.once('error', reject);
  });

type Records = { record: Buffer; rest: Buffer };

function firstRecord(
  socket: Duplex,
  earlier: Buffer = Buffer.alloc(0),
): Promise<Records> {
  return new Promise<Records>((resolve, reject): void => {
    const read = recordReader(socket, resolve);

    socket.once('error', reject);
    socket.once('close', (): void =>
      reject(new Error('The Server closed the channel')),
    );

    if (earlier.length > 0) read(earlier);
    else {
      socket.once('data', read);
      socket.resume();
    }
  });
}

// Reads until the Server's first whole record has arrived, and hands back whatever followed it in the same chunk.
function recordReader(
  socket: Duplex,
  resolve: (records: Records) => void,
): (chunk: Buffer) => void {
  const records = new FrameReader();

  const read = (chunk: Buffer): void => {
    const [record, ...rest] = records.push(chunk);

    // Paused, so a carrier that delivers each record as a message of its own, such as a WebSocket, holds the next one until it is asked for.
    if (record) {
      socket.pause();
      resolve({ record, rest: Buffer.concat(rest.map(frameRecord)) });
    } else socket.once('data', read);
  };

  return read;
}

interface Connecting {
  socket: Duplex;
  handshake: ReturnType<typeof startHandshake>;
  input: ChannelInput;
}

async function accept(
  { socket, handshake, input }: Connecting,
  { record, rest }: Records,
): Promise<OpenedChannel> {
  const accepted = handshake.accept(record);
  const answer = PairingAnswer.parse(JSON.parse(accepted.welcome.toString()));

  if ('asked' in answer) {
    input.onAsked?.();

    return welcomed(socket, accepted.cipher, await firstRecord(socket, rest));
  }

  return settled(socket, answer, { rest, cipher: accepted.cipher });
}

// The welcome that followed the early answer, sealed by the channel's own cipher.
function welcomed(
  socket: Duplex,
  cipher: ChannelCipher,
  { record, rest }: Records,
): OpenedChannel {
  const welcome = PairingWelcome.parse(
    JSON.parse(cipher.open(record).toString()),
  );

  return settled(socket, welcome, { rest, cipher });
}

function settled(
  socket: Duplex,
  welcome: PairingWelcome,
  channel: { rest: Buffer; cipher: ChannelCipher },
): OpenedChannel {
  if (!welcome.paired) return refuse(socket, welcome.refusal);

  return {
    socket: resumed(socket, channel, 'compression' in welcome),
    deviceId: welcome.deviceId,
  };
}

function refuse(socket: Duplex, refusal: PairingRefusal): never {
  socket.destroy();

  throw new PairingRefused(refusal);
}

function resumed(
  socket: Duplex,
  { rest, cipher }: { rest: Buffer; cipher: ChannelCipher },
  compression: boolean,
): ChannelSocket {
  socket.pause();

  if (rest.length > 0) socket.unshift(rest);
  const channel = new ChannelSocket(socket, cipher, compression);
  socket.resume();

  return channel;
}
