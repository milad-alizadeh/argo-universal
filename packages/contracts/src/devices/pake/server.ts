import { equalBytes } from '@noble/curves/utils.js';
import { concatBytes } from '@noble/hashes/utils.js';
import {
  elementBytes,
  generator,
  type GroupElement,
  randomElement,
  randomScalar,
  readElement,
  sidBytes,
  type RandomBytes,
} from './group';
import { confirmation, sealOffer, sessionKeys } from './session';
import {
  askBytes,
  entryBytes,
  mostOffered,
  offeredReply,
  refusedReply,
  statusBytes,
  type TicketStatus,
} from './wire';

// A Ticket the Server has outstanding, or recently had, and what it can say about it to someone who proves they hold its code.
export interface OfferedTicket {
  readonly code: string;
  readonly status: TicketStatus;
}

export interface ServerRun {
  // The Server's one reply, to send framed.
  readonly reply: Uint8Array;
  // Whether the Device's last message proves it derived the secret of one of the Tickets offered.
  readonly proves: (confirm: Uint8Array) => boolean;
}

interface Asked {
  readonly sid: Uint8Array;
  readonly element: GroupElement;
  readonly random: RandomBytes;
}

interface Made {
  readonly entry: Uint8Array;
  readonly confirm: Uint8Array;
}

export interface Offering {
  // The Tickets the Server can say something about.
  readonly tickets: readonly OfferedTicket[];
  // The Server's static public key, which only a live Ticket's entry carries.
  readonly publicKey: Uint8Array;
}

export const refuseRun = (refusal: string): Uint8Array =>
  concatBytes(Uint8Array.of(refusedReply), new TextEncoder().encode(refusal));

/*
 * The Server's half of a typed code (ADR-0045): one entry for every Ticket it has outstanding, each made for that Ticket's code and carrying the Server's static public key sealed under a secret only a holder of that code derives.
 * It does not know which Ticket the Device holds and the reply does not say; an entry made for another code is noise to the Device. The Device's last message is what shows it holds one, and a run that never gets one is a guess.
 * Throws on a malformed opening; the caller counts that against the source.
 */
export function answerRun(
  ask: Uint8Array,
  offering: Offering,
  random: RandomBytes,
): ServerRun {
  const asked = askedOf(ask, random);

  const made = offering.tickets
    .slice(0, mostOffered)
    .map((ticket) => entryFor(asked, ticket, offering.publicKey));

  return {
    reply: concatBytes(Uint8Array.of(offeredReply), ...entries(made, random)),
    proves: (confirm) => proven(made, confirm),
  };
}

function askedOf(ask: Uint8Array, random: RandomBytes): Asked {
  if (ask.length !== askBytes) throw new Error('A malformed opening');

  return {
    sid: ask.subarray(0, sidBytes),
    element: readElement(ask.subarray(sidBytes)),
    random,
  };
}

// An entry no Device can open, made like the real ones: an element, then bytes that look sealed.
const pad = (random: RandomBytes): Uint8Array =>
  concatBytes(randomElement(random), random(entryBytes - elementBytes));

// Always as many entries as a reply can hold, so how many Tickets are outstanding, and whether the pair sheet is open, is not something to read off its length. A pad is noise to a Device, like any entry made for a code it does not hold, and decodes like one.
const entries = (made: readonly Made[], random: RandomBytes): Uint8Array[] =>
  Array.from(
    { length: mostOffered },
    (_, at) => made[at]?.entry ?? pad(random),
  );

// Only a live Ticket's entry carries the key; the others only say what became of the Ticket.
const statement = (ticket: OfferedTicket, publicKey: Uint8Array): Uint8Array =>
  concatBytes(
    Uint8Array.of(statusBytes[ticket.status]),
    ticket.status === 'live' ? publicKey : new Uint8Array(elementBytes),
  );

function entryFor(
  { sid, element, random }: Asked,
  ticket: OfferedTicket,
  publicKey: Uint8Array,
): Made {
  // A scalar of its own for every Ticket, so learning one entry's secret says nothing about the others.
  const exponent = randomScalar(random);
  const server = generator(ticket.code, sid).multiply(exponent).toBytes();
  const transcript = { sid, device: element.toBytes(), server };
  const keys = sessionKeys(element.multiply(exponent), transcript);
  const sealed = sealOffer(keys, transcript, statement(ticket, publicKey));

  return {
    entry: concatBytes(server, sealed),
    confirm: confirmation(keys, transcript),
  };
}

const confirmFor = (
  made: readonly Made[],
  index: number | undefined,
): Uint8Array | undefined => made[index ?? made.length]?.confirm;

function proven(made: readonly Made[], confirm: Uint8Array): boolean {
  const expected = confirmFor(made, confirm[0]);

  return expected ? equalBytes(confirm.subarray(1), expected) : false;
}
