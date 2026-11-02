import { PairingRefusal } from '@repo/contracts';
import {
  pakeMagic,
  startRun,
  type DeviceRun,
  type Offer,
  type Reading,
} from '@repo/contracts/pake';
import type { ByteSocket, ChannelAddress } from './channel/byte-socket';
import { concatBytes } from './channel/bytes';
import { appChannelPlatform } from './channel/channel-platform';
import type { ChannelPlatform } from './channel/channel-transport';
import { FrameReader, frameRecord } from './channel/frames';
import { PairingRefused } from './channel/open-channel';
import { storedPublicKey } from './channel/x25519';

/*
 * Asks the Server at `address` for its key with the code the owner typed, and answers it as the QR would have carried it (ADR-0045).
 * The code is the password of a key exchange, so nothing on the wire lets a watcher test a guess of it. A Server the code does not belong to refuses with `PairingRefused`, and one that cannot be reached throws something else: the first means the code is wrong, the second only that this is not where the Server is.
 */
export async function requestServerKey(
  address: ChannelAddress,
  ticket: string,
  options: { platform?: ChannelPlatform } = {},
): Promise<string> {
  const platform = options.platform ?? appChannelPlatform;
  const run = startRun(ticket, platform.randomBytes);
  const socket = await platform.openSocket(address);

  return keyOf((await converse(socket, run)).offer);
}

// The key the Server offered as the QR would have carried it, or the Server's reason it will not.
function keyOf(offer: Offer): string {
  if (!offer.offered)
    throw new PairingRefused(PairingRefusal.parse(offer.refusal));

  return storedPublicKey(offer.publicKey);
}

// What was heard of the Server's one reply, and the proof sent back when the Device has one; one that opened no entry has nothing to prove and leaves.
class Hearing {
  public reading: Reading | undefined;
  private readonly frames = new FrameReader();

  public constructor(
    private readonly socket: ByteSocket,
    private readonly run: DeviceRun,
  ) {}

  public hear(chunk: Uint8Array): void {
    const [reply] = this.frames.push(chunk);

    if (reply && !this.reading) this.respond(reply);
  }

  private respond(reply: Uint8Array): void {
    this.reading = this.run.read(reply);

    if (this.reading.confirm)
      this.socket.write(frameRecord(this.reading.confirm));
    else this.socket.close();
  }
}

// The opening out, the Server's reply in, and the proof back; then the Server closes, which is how this knows it was heard.
function converse(socket: ByteSocket, run: DeviceRun): Promise<Reading> {
  return new Promise<Reading>((resolve, reject): void => {
    const hearing = new Hearing(socket, run);

    socket.onData = (chunk): void => hearing.hear(chunk);
    socket.onClose = (error): void =>
      hearing.reading
        ? resolve(hearing.reading)
        : reject(
            error ?? new Error('The Server closed without offering its key'),
          );

    socket.write(concatBytes(pakeMagic, frameRecord(run.ask)));
  });
}
