import {
  PairingAnswer,
  PairingWelcome,
  type PairingClaim,
  type PairingRefusal,
} from '@repo/contracts';
import type { ByteSocket, ChannelAddress, OpenSocket } from './byte-socket';
import { bytesText, concatBytes, textBytes } from './bytes';
import type { ChannelCipher } from './channel-cipher';
import { frameRecord } from './frames';
import { startHandshake, type InitiatorHandshake } from './noise-initiator';
import { RecordInbox } from './record-inbox';
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
  // Whether this carrier can inflate what the Server compresses, which is offered in the handshake. The native module can; the JavaScript stream cannot, and is sent every record as it is (ADR-0045).
  readonly compression?: boolean;
  // Called when the Server says the request is with the owner, before the owner has answered.
  readonly onAsked?: () => void;
}

export interface OpenedChannel {
  readonly stream: SecureStream;
  readonly deviceId: string;
  // Whether the Server agreed to compress: every record from here on opens with a byte that says whether the rest is deflated, which only the module reads.
  readonly compressed: boolean;
}

const claimOf = ({ claim, compression }: ChannelInput): PairingClaim =>
  compression ? { ...claim, compression: 'deflate-raw' } : claim;

const handshakeOf = (input: ChannelInput): InitiatorHandshake =>
  startHandshake({
    deviceKey: input.deviceKey,
    serverPublicKey: rawFromStoredPublicKey(input.serverPublicKey),
    claim: textBytes(JSON.stringify(claimOf(input))),
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
  const inbox = new RecordInbox(socket);

  socket.write(concatBytes(channelMagic, frameRecord(handshake.message)));

  return closingOnFailure(
    socket,
    answered({ socket, inbox, input }, handshake.accept),
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

interface Opening {
  socket: ByteSocket;
  inbox: RecordInbox;
  input: ChannelInput;
}

async function answered(
  opening: Opening,
  accept: InitiatorHandshake['accept'],
): Promise<OpenedChannel> {
  const { welcome, cipher } = accept(await opening.inbox.next());
  const answer = PairingAnswer.parse(JSON.parse(bytesText(welcome)));

  if ('asked' in answer) {
    opening.input.onAsked?.();

    return opened(opening, cipher, await sealedWelcome(opening.inbox, cipher));
  }

  return opened(opening, cipher, answer);
}

// After an early answer, the welcome is the first record the channel's own cipher seals.
async function sealedWelcome(
  inbox: RecordInbox,
  cipher: ChannelCipher,
): Promise<PairingWelcome> {
  const record = await inbox.next();

  return PairingWelcome.parse(JSON.parse(bytesText(cipher.open(record))));
}

function opened(
  { socket, inbox }: Opening,
  cipher: ChannelCipher,
  welcome: PairingWelcome,
): OpenedChannel {
  if (!welcome.paired) throw new PairingRefused(welcome.refusal);

  return {
    stream: new SecureStream(socket, cipher, inbox.rest()),
    deviceId: welcome.deviceId,
    compressed: welcome.compression !== undefined,
  };
}
