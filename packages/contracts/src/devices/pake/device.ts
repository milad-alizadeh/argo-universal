import { concatBytes } from '@noble/hashes/utils.js';
import {
  elementBytes,
  generator,
  randomScalar,
  readElement,
  sidBytes,
  type RandomBytes,
} from './group';
import {
  confirmation,
  openOffer,
  sessionKeys,
  type SessionKeys,
  type Transcript,
} from './session';
import { entryBytes, mostOffered, offeredReply, statusBytes } from './wire';

// What the Server said about the code: its key, or why it will not give it.
export type Offer =
  | { offered: true; publicKey: Uint8Array }
  | { offered: false; refusal: string };

export interface Reading {
  readonly offer: Offer;
  // What to send back so the Server counts this run as a holder's and not a guess; nothing when no entry opened.
  readonly confirm?: Uint8Array;
}

export interface DeviceRun {
  // The opening to send after the magic, framed.
  readonly ask: Uint8Array;
  // What to make of the Server's one reply.
  readonly read: (reply: Uint8Array) => Reading;
}

interface Secret {
  readonly code: string;
  readonly sid: Uint8Array;
  readonly exponent: bigint;
  readonly element: Uint8Array;
}

interface Opened {
  readonly index: number;
  readonly keys: SessionKeys;
  readonly transcript: Transcript;
  readonly plaintext: Uint8Array;
}

const wrongCode: Offer = { offered: false, refusal: 'ticket-unknown' };

const refusals = new Map([
  [statusBytes.spent, 'ticket-spent'],
  [statusBytes.expired, 'ticket-expired'],
]);

const attempt = <T>(run: () => T): T | undefined => {
  try {
    return run();
  } catch {
    return undefined;
  }
};

/*
 * The Device's half of a typed code (ADR-0045), the Server's being `answerRun`. A password-authenticated key exchange keyed by the code, after CPace: the code makes the generator, so a watcher who has the whole transcript still has nothing to test a guess against.
 * What comes out of a run is the Server's static public key, sealed under a secret only a holder of the code derives, so a computer that was not told the code cannot hand this Device a key of its own.
 */
export function startRun(code: string, random: RandomBytes): DeviceRun {
  const sid = random(sidBytes);
  const exponent = randomScalar(random);
  const element = generator(code, sid).multiply(exponent).toBytes();
  const secret = { code, sid, exponent, element };

  return {
    ask: concatBytes(sid, element),
    read: (reply) => readReply(secret, reply),
  };
}

function readReply(secret: Secret, reply: Uint8Array): Reading {
  if (reply[0] !== offeredReply)
    return { offer: { offered: false, refusal: textOf(reply.subarray(1)) } };

  const entries = split(reply.subarray(1));
  const opened = entries.map((e, i) => open(secret, i, e)).find(Boolean);

  return opened ? answer(opened) : { offer: wrongCode };
}

const textOf = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);

function split(entries: Uint8Array): Uint8Array[] {
  if (
    entries.length % entryBytes !== 0 ||
    entries.length > entryBytes * mostOffered
  )
    throw new Error('The Server offered a malformed set of Tickets');

  return Array.from({ length: entries.length / entryBytes }, (_, at) =>
    entries.subarray(at * entryBytes, (at + 1) * entryBytes),
  );
}

// The entry made for this code, which is the only one whose seal opens.
function open(
  secret: Secret,
  index: number,
  entry: Uint8Array,
): Opened | undefined {
  const server = entry.subarray(0, elementBytes);

  return attempt((): Opened => {
    const shared = readElement(server).multiply(secret.exponent);
    const transcript = { sid: secret.sid, device: secret.element, server };
    const keys = sessionKeys(shared, transcript);
    const plaintext = openOffer(keys, transcript, entry.subarray(elementBytes));

    return { index, keys, transcript, plaintext };
  });
}

function answer({ index, keys, transcript, plaintext }: Opened): Reading {
  const confirm = concatBytes(
    Uint8Array.of(index),
    confirmation(keys, transcript),
  );

  const refusal = refusals.get(plaintext[0] ?? statusBytes.live);

  return {
    confirm,
    offer: refusal
      ? { offered: false, refusal }
      : { offered: true, publicKey: plaintext.subarray(1) },
  };
}
