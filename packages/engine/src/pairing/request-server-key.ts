import { connect, type Socket } from 'node:net';
import { PairingRefusal } from '@repo/contracts';
import { PairingRefused, type ChannelAddress } from './connect-channel';
import { FrameReader, frameRecord } from './frames';
import { askForKey, keyMagic, readOffer } from './key-offer';
import { storedPublicKey } from './x25519';

/*
 * The App's side of a typed code over a real socket: ask the Server at `address` for its key with the code the owner typed, and get back the key as the QR would have carried it (ADR-0045).
 * It is the Node implementation, which the Engine's own tests connect through; the App has its own beside its channel. A Server the code does not belong to refuses, and so does one that was never told it: either way no key arrives.
 */
export async function requestServerKey(
  address: ChannelAddress,
  ticket: string,
): Promise<string> {
  const question = askForKey(ticket);
  const answer = await exchange(address, question);
  const offer = readOffer({ ticket, question }, answer);

  if (!offer.offered)
    throw new PairingRefused(PairingRefusal.parse(offer.refusal));

  return storedPublicKey(offer.publicKey);
}

// One question out, one answer back, then the socket is done with.
function exchange(address: ChannelAddress, question: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject): void => {
    const socket = connect(address.port, address.host, (): void => {
      socket.write(Buffer.concat([keyMagic, frameRecord(question)]));
    });

    listen(socket, resolve);
    socket.once('error', reject);
    socket.once('close', (): void =>
      reject(new Error('The Server closed without offering its key')),
    );
  });
}

function listen(socket: Socket, resolve: (answer: Buffer) => void): void {
  const frames = new FrameReader();

  socket.on('data', (chunk): void => {
    const [record] = frames.push(chunk);

    if (!record) return;
    socket.destroy();
    resolve(record);
  });
}
