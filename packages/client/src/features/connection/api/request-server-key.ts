import { PairingRefusal } from '@repo/contracts';
import type { ByteSocket, ChannelAddress } from './channel/byte-socket';
import { concatBytes } from './channel/bytes';
import { appChannelPlatform } from './channel/channel-platform';
import type { ChannelPlatform } from './channel/channel-transport';
import { FrameReader, frameRecord } from './channel/frames';
import { askForKey, keyMagic, type Offer } from './channel/key-offer';
import { PairingRefused } from './channel/open-channel';
import { storedPublicKey } from './channel/x25519';

/*
 * Asks the Server at `address` for its key with the code the owner typed, and answers it as the QR would have carried it (ADR-0045).
 * A Server the code does not belong to refuses with `PairingRefused`, and one that cannot be reached throws something else: the first means the code is wrong, the second only that this is not where the Server is.
 */
export async function requestServerKey(
  address: ChannelAddress,
  ticket: string,
  options: { platform?: ChannelPlatform } = {},
): Promise<string> {
  const platform = options.platform ?? appChannelPlatform;
  const question = askForKey(ticket, platform.randomBytes);
  const socket = await platform.openSocket(address);

  try {
    return keyOf(question.read(await ask(socket, question.ask)));
  } finally {
    socket.close();
  }
}

// The key the Server offered as the QR would have carried it, or the Server's reason it will not.
function keyOf(offer: Offer): string {
  if (!offer.offered)
    throw new PairingRefused(PairingRefusal.parse(offer.refusal));

  return storedPublicKey(offer.publicKey);
}

// One question out and the Server's one answer back.
function ask(socket: ByteSocket, question: Uint8Array): Promise<Uint8Array> {
  const answer = answerTo(socket);

  socket.write(concatBytes(keyMagic, frameRecord(question)));

  return answer;
}

// The Server's one answer, or the error that ended the socket without one.
function answerTo(socket: ByteSocket): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject): void => {
    const records = new FrameReader();

    socket.onClose = (error): void =>
      reject(error ?? new Error('The Server closed without offering its key'));

    socket.onData = (chunk): void => {
      const [record] = records.push(chunk);

      if (record) resolve(record);
    };
  });
}
