import {
  PairingWelcome,
  type PairingClaim,
  type PairingRefusal,
} from '@repo/contracts';
import type { ByteSocket, ChannelAddress, OpenSocket } from './byte-socket';
import { bytesText, concatBytes, textBytes } from './bytes';
import { FrameReader, frameRecord } from './frames';
import { startHandshake, type InitiatorHandshake } from './noise-initiator';
import { SecureStream } from './secure-stream';
import { rawFromStoredPublicKey, type Keypair } from './x25519';

// What a Device sends before anything else, so the one port can tell a channel from plain HTTP. It must equal the Server's `channelMagic`: a zero byte, then ARGO.
const channelMagic = concatBytes(new Uint8Array(1), textBytes('ARGO'));

// A Server that answered, and said why this Device gets no Connection. The App draws `ticket-expired` and `ticket-spent` as an expired code.
export class PairingRefused extends Error {
  public constructor(public readonly refusal: PairingRefusal) {
    super(`The Server refused this Device: ${refusal}`);
  }
}

export interface ChannelInput {
  readonly address: ChannelAddress;
  // The Server's static public key as the QR code carried it; a Server that does not hold its private half cannot answer.
  readonly serverPublicKey: string;
  readonly deviceKey: Keypair;
  readonly claim: PairingClaim;
  readonly randomBytes: (length: number) => Uint8Array;
}

export interface OpenedChannel {
  readonly stream: SecureStream;
  readonly deviceId: string;
}

const handshakeOf = (input: ChannelInput): InitiatorHandshake =>
  startHandshake({
    deviceKey: input.deviceKey,
    serverPublicKey: rawFromStoredPublicKey(input.serverPublicKey),
    claim: textBytes(JSON.stringify(input.claim)),
    randomBytes: input.randomBytes,
  });

/*
 * The App's side of the channel over a real socket: open it, prove which Device Key this is, and return the plaintext stream every later call travels on (ADR-0045).
 */
export async function openChannel(
  input: ChannelInput,
  openSocket: OpenSocket,
): Promise<OpenedChannel> {
  const handshake = handshakeOf(input);
  const socket = await openSocket(input.address);
  const answer = firstRecord(socket);

  socket.write(concatBytes(channelMagic, frameRecord(handshake.message)));

  return closingOnFailure(
    socket,
    answer.then((read) => welcomed(socket, handshake.accept, read)),
  );
}

async function closingOnFailure<T>(
  socket: ByteSocket,
  work: Promise<T>,
): Promise<T> {
  try {
    return await work;
  } catch (cause) {
    socket.close();
    throw cause;
  }
}

interface Answer {
  record: Uint8Array;
  rest: Uint8Array;
}

// Reads until the Server's first whole record has arrived, and keeps whatever followed it in the same chunk.
function firstRecord(socket: ByteSocket): Promise<Answer> {
  return new Promise<Answer>((resolve, reject): void => {
    const records = new FrameReader();

    socket.onClose = (error): void =>
      reject(error ?? new Error('The Server closed the channel'));

    socket.onData = (chunk): void => {
      const [record, ...rest] = records.push(chunk);

      if (record)
        resolve({ record, rest: concatBytes(...rest.map(frameRecord)) });
    };
  });
}

function welcomed(
  socket: ByteSocket,
  accept: InitiatorHandshake['accept'],
  { record, rest }: Answer,
): OpenedChannel {
  const accepted = accept(record);

  const welcome = PairingWelcome.parse(JSON.parse(bytesText(accepted.welcome)));

  if (!welcome.paired) throw new PairingRefused(welcome.refusal);

  return {
    stream: new SecureStream(socket, accepted.cipher, rest),
    deviceId: welcome.deviceId,
  };
}
