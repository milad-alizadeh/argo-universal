import { sha256 } from '@noble/hashes/sha2.js';
import { bytesText, concatBytes, textBytes } from './bytes';
import { CipherState, deriveKeys } from './cipher-state';
import { keyBytes } from './x25519';

// What a Device sends before anything else when it was typed a Pairing Ticket instead of shown a QR. It must equal the Server's `keyMagic`: a zero byte, then ARGK.
export const keyMagic = concatBytes(new Uint8Array(1), textBytes('ARGK'));

const nonceBytes = 16;

const refused = 0;

const askLabel = sha256(textBytes('argo-key-ask/1'));

const offerLabel = sha256(textBytes('argo-key-offer/1'));

const keyFor = (label: Uint8Array, ...material: Uint8Array[]): CipherState =>
  new CipherState(deriveKeys(label, concatBytes(...material))[1]);

export interface Question {
  // The bytes to send after the magic, framed.
  readonly ask: Uint8Array;
  // What to make of the Server's answer: the key it sealed to this code, or why it will not.
  readonly read: (answer: Uint8Array) => Offer;
}

export type Offer =
  | { offered: true; publicKey: Uint8Array }
  | { offered: false; refusal: string };

/*
 * The App's half of a typed code (ADR-0045), the other half being the Server's `key-offer.ts`: the key is sealed under the code and a nonce from each side, so only a computer that was told the code can hand this Device a key it will accept.
 * The code is the owner's, typed from the other computer's screen, so it is the one thing a computer on the network cannot have.
 */
export function askForKey(
  ticket: string,
  randomBytes: (length: number) => Uint8Array,
): Question {
  const code = textBytes(ticket);
  const nonce = randomBytes(nonceBytes);

  const sealed = keyFor(askLabel, code, nonce).seal(nonce, new Uint8Array(0));

  return {
    ask: concatBytes(nonce, sealed),
    read: (answer) => readOffer({ code, nonce }, answer),
  };
}

function readOffer(asked: Asked, answer: Uint8Array): Offer {
  if (answer[0] === refused)
    return { offered: false, refusal: bytesText(answer.subarray(1)) };

  return { offered: true, publicKey: openedKey(asked, answer) };
}

interface Asked {
  readonly code: Uint8Array;
  readonly nonce: Uint8Array;
}

function openedKey({ code, nonce }: Asked, answer: Uint8Array): Uint8Array {
  const theirs = answer.subarray(1, 1 + nonceBytes);
  const opening = keyFor(offerLabel, code, nonce, theirs);

  const publicKey = opening.open(
    concatBytes(nonce, theirs),
    answer.subarray(1 + nonceBytes),
  );

  if (publicKey.length !== keyBytes)
    throw new Error('The Server offered a key of the wrong length');

  return publicKey;
}
