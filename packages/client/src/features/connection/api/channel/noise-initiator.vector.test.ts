import { noiseIkVector } from '@repo/engine/pairing-vector';
import { expect, it } from 'vitest';
import { bytesText, textBytes } from './bytes';
import { startHandshake } from './noise-initiator';
import { keypairFromPrivateKey } from './x25519';

const bytes = (hex: string): Uint8Array =>
  Uint8Array.from(hex.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));

const hex = (data: Uint8Array): string =>
  [...data].map((byte) => byte.toString(16).padStart(2, '0')).join('');

const [opening, answering] = noiseIkVector.handshake;

/*
 * The App's half checked against bytes somebody else's code produced: the Server's Noise is on `node:crypto` and this one is on @noble, so the two agreeing with the published vector is what says they agree with each other.
 */
function initiator(): ReturnType<typeof startHandshake> {
  return startHandshake(
    {
      deviceKey: keypairFromPrivateKey(bytes(noiseIkVector.initiatorStatic)),
      serverPublicKey: bytes(noiseIkVector.responderPublicKey),
      claim: textBytes(opening.payload),
      randomBytes: () => {
        throw new Error('A vector fixes the ephemeral key');
      },
    },
    {
      ephemeral: keypairFromPrivateKey(bytes(noiseIkVector.initiatorEphemeral)),
      prologue: textBytes(noiseIkVector.prologue),
    },
  );
}

it('sends the first message the published vector states, byte for byte', () => {
  expect(hex(initiator().message)).toBe(opening.message);
});

it('reads the second message and the records that follow as the vector states them', () => {
  const accepted = initiator().accept(bytes(answering.message));
  const [first, second] = noiseIkVector.records;

  expect(bytesText(accepted.welcome)).toBe(answering.payload);
  expect(hex(accepted.cipher.seal(textBytes(first.payload)))).toBe(
    first.message,
  );
  expect(bytesText(accepted.cipher.open(bytes(second.message)))).toBe(
    second.payload,
  );
});
