import { randomBytes } from 'node:crypto';
import { connect, type Socket } from 'node:net';
import { PairingRefusal } from '@repo/contracts';
import { pakeMagic, startRun } from '@repo/contracts/pake';
import { PairingRefused, type ChannelAddress } from './connect-channel';
import { FrameReader, frameRecord } from './frames';
import { storedPublicKey } from './x25519';

/*
 * The App's side of a typed code over a real socket: ask the Server at `address` for its key with the code the owner typed, and get back the key as the QR would have carried it (ADR-0045).
 * It is the Node implementation, which the Engine's own tests connect through; the App has its own beside its channel. A Server the code does not belong to refuses, and so does one that was never told it: either way no key arrives.
 */
export async function requestServerKey(
  address: ChannelAddress,
  ticket: string,
): Promise<string> {
  const run = startRun(ticket, randomBytes);

  const reply = await exchange(
    address,
    run.ask,
    (heard) => run.read(heard).confirm,
  );

  const { offer } = run.read(reply);

  if (!offer.offered)
    throw new PairingRefused(PairingRefusal.parse(offer.refusal));

  return storedPublicKey(Buffer.from(offer.publicKey));
}

// What was heard of the Server's one reply, and the proof sent back when `answer` has one.
class Replies {
  public heard: Buffer | undefined;
  private readonly frames = new FrameReader();

  public constructor(
    private readonly socket: Socket,
    private readonly answer?: (reply: Buffer) => Uint8Array | undefined,
  ) {}

  public push(chunk: Buffer): void {
    const [reply] = this.frames.push(chunk);

    if (reply && !this.heard) this.respond(reply);
  }

  // The Server closed: what it said, or that it said nothing.
  public settle(
    resolve: (reply: Buffer) => void,
    reject: (error: Error) => void,
  ): void {
    if (this.heard) resolve(this.heard);
    else reject(new Error('The Server closed without offering its key'));
  }

  private respond(reply: Buffer): void {
    this.heard = reply;
    const proof = this.answer?.(reply);

    if (proof) this.socket.write(frameRecord(Buffer.from(proof)));
    else this.socket.destroy();
  }
}

// A socket to the Server with the opening already on its way.
function knock(address: ChannelAddress, ask: Uint8Array): Socket {
  const opening = Buffer.concat([pakeMagic, frameRecord(Buffer.from(ask))]);
  const socket = connect(address.port, address.host);

  socket.once('connect', (): void => void socket.write(opening));

  return socket;
}

/*
 * The opening out, the Server's reply in, and the proof back when there is one; then the Server closes, which is how this knows it was heard. Resolves with the reply.
 * Tests use it to say what a Device does not: send a proof it should not have, or none.
 */
export function exchange(
  address: ChannelAddress,
  ask: Uint8Array,
  answer?: (reply: Buffer) => Uint8Array | undefined,
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject): void => {
    const socket = knock(address, ask);
    const replies = new Replies(socket, answer);

    socket.on('data', (chunk) => replies.push(chunk));
    socket.once('error', reject);
    socket.once('close', (): void => replies.settle(resolve, reject));
  });
}
