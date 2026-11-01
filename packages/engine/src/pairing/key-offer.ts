import { createHash, randomBytes } from 'node:crypto';
import { CipherState, deriveKeys, tagBytes } from './cipher-state';
import { keyBytes } from './x25519';

/*
 * What a Device sends before anything else when it was typed a Pairing Ticket instead of shown a QR, so the one port can tell it from a channel and from plain HTTP.
 * Same length as the channel's, and a different last byte.
 */
export const keyMagic = Buffer.concat([Buffer.alloc(1), Buffer.from('ARGK')]);

export const nonceBytes = 16;

// A question is a nonce and the empty record sealed under the code: nothing but the tag.
export const askBytes = nonceBytes + tagBytes;

const sha256 = (data: Buffer): Buffer =>
  createHash('sha256').update(data).digest();

const askLabel = sha256(Buffer.from('argo-key-ask/1'));

const offerLabel = sha256(Buffer.from('argo-key-offer/1'));

const keyFor = (label: Buffer, ...material: Buffer[]): CipherState =>
  new CipherState(deriveKeys(label, Buffer.concat(material))[1]);

const codeBytes = (ticket: string): Buffer => Buffer.from(ticket);

/*
 * A QR carries the Server's static public key; 32 bytes will not fit in a code someone types. So the typed code is the secret that stands in for the QR: a Device that holds it asks for the key, shows it holds it, and is given the key sealed under it (ADR-0045).
 * Both messages are sealed under keys made from the code and fresh nonces. Nobody who lacks the code can ask for the key, read it off the wire, or hand a Device a key of their own, because a key not sealed under the code does not open.
 * The code is 50 bits and lives two minutes, so there is no time to try them all; the ones tried against the Server are counted against their source like any wrong Ticket.
 */

// The Device's question: a fresh nonce, and a record only a holder of the code can seal.
export function askForKey(ticket: string): Buffer {
  const nonce = randomBytes(nonceBytes);

  const sealed = keyFor(askLabel, codeBytes(ticket), nonce).seal(
    nonce,
    Buffer.alloc(0),
  );

  return Buffer.concat([nonce, sealed]);
}

export interface Question {
  readonly nonce: Buffer;
  // Whether the Device sealed its question under this code.
  readonly holds: (ticket: string) => boolean;
}

const opens = (open: () => Buffer): boolean => {
  try {
    open();

    return true;
  } catch {
    return false;
  }
};

export function readQuestion(ask: Buffer): Question {
  if (ask.length !== askBytes)
    throw new Error('A question for the Server key is the wrong length');
  const nonce = ask.subarray(0, nonceBytes);
  const sealed = ask.subarray(nonceBytes);

  return {
    nonce,
    holds: (ticket) =>
      opens(() =>
        keyFor(askLabel, codeBytes(ticket), nonce).open(nonce, sealed),
      ),
  };
}

const offered = 1;

const refused = 0;

// The key, sealed to the code the Device proved it holds, with a nonce of the Server's own so the answer cannot be replayed into another exchange.
export function offerKey(
  question: Question,
  ticket: string,
  publicKey: Buffer,
): Buffer {
  const nonce = randomBytes(nonceBytes);
  const code = codeBytes(ticket);
  const sealing = keyFor(offerLabel, code, question.nonce, nonce);

  const sealed = sealing.seal(
    Buffer.concat([question.nonce, nonce]),
    publicKey,
  );

  return Buffer.concat([Buffer.of(offered), nonce, sealed]);
}

export const refuseKey = (refusal: string): Buffer =>
  Buffer.concat([Buffer.of(refused), Buffer.from(refusal)]);

// What the Device makes of the Server's answer: the key it was offered, or the reason it was not.
export type Offer =
  | { offered: true; publicKey: Buffer }
  | { offered: false; refusal: string };

interface Asked {
  readonly ticket: string;
  // What this Device sent, so the answer is read against the nonce it chose.
  readonly question: Buffer;
}

export function readOffer(asked: Asked, answer: Buffer): Offer {
  if (answer[0] === refused)
    return { offered: false, refusal: answer.subarray(1).toString() };

  return { offered: true, publicKey: openedKey(asked, answer) };
}

function openedKey({ ticket, question }: Asked, answer: Buffer): Buffer {
  const asked = question.subarray(0, nonceBytes);
  const theirs = answer.subarray(1, 1 + nonceBytes);
  const opening = keyFor(offerLabel, codeBytes(ticket), asked, theirs);

  const publicKey = opening.open(
    Buffer.concat([asked, theirs]),
    answer.subarray(1 + nonceBytes),
  );

  if (publicKey.length !== keyBytes)
    throw new Error('The Server offered a key of the wrong length');

  return publicKey;
}
