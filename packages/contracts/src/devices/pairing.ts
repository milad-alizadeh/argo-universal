import { z } from 'zod';
import { DevicePlatform } from './device';

/*
 * The Pairing Ticket the owner reads off the QR or types in: ten characters of Crockford base32, which is 50 bits.
 * A typed code is the only thing that proves to a Device with no QR which computer it is talking to (ADR-0045), so it has to be too large to guess in the two minutes it lives; six digits were not.
 */
export const pairingTicketLength = 10;

// Crockford's base32: no I, L, O or U, so nothing in a code can be mistaken for another character when it is read aloud or retyped.
export const pairingTicketAlphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const groupLength = pairingTicketLength / 2;

// The Ticket as it is drawn for reading aloud: two groups of five.
export const formatPairingTicket = (ticket: string): string =>
  `${ticket.slice(0, groupLength)}-${ticket.slice(groupLength)}`;

const ticketPattern = new RegExp(
  `^[${pairingTicketAlphabet}]{${pairingTicketLength}}$`,
);

/*
 * What the owner typed, as a Ticket, or nothing when it cannot be one. Case, spaces, dashes and dots are free, and the letters Crockford folds into digits are folded, so a code read aloud and typed back loses nothing to the way it was said.
 */
export function readTypedTicket(typed: string): string | undefined {
  const ticket = typed
    .toUpperCase()
    .replaceAll(/[\s\-·.]/g, '')
    .replaceAll('O', '0')
    .replaceAll(/[IL]/g, '1');

  return ticketPattern.test(ticket) ? ticket : undefined;
}

// About two minutes, so a photograph of the screen is not a lasting key (ADR-0045).
export const pairingTicketLifetimeMs = 120_000;

// How long a Device that has spent a Ticket waits for the owner to answer on the pair sheet before the Server stops holding its registration (ADR-0045).
export const pairingAnswerLifetimeMs = 120_000;

// How many codes may be presented and refused before the outstanding Tickets are revoked and the sheet mints another.
export const pairingTicketAttempts = 10;

/*
 * Why a Server refused to pair with a Device or to recognise one. The App draws `ticket-expired` and `ticket-spent` as "This code has expired" and offers a new one; the rest it cannot resolve by itself.
 * `declined` and `unanswered` are the owner's No and the owner's silence: the Server held this Device's registration, and never wrote it down.
 * `ticket-required` answers a Device this Server has no row for that brought no Ticket, and `replayed` one that repeats an exchange someone watched.
 */
export const PairingRefusal = z.enum([
  'ticket-required',
  'ticket-unknown',
  'ticket-spent',
  'ticket-expired',
  'ticket-attempts',
  'declined',
  'unanswered',
  'replayed',
]);

export type PairingRefusal = z.infer<typeof PairingRefusal>;

// What the QR code carries, so an App knows which Server it is talking to before it says anything (ADR-0045).
export const PairingInvite = z.strictObject({
  // The Server's static public key, which the App stores and checks on every later connect.
  key: z.string(),
  // The Server's discovery name, which the App re-resolves to an address on each connect.
  server: z.string(),
  ticket: z.string(),
});

export type PairingInvite = z.infer<typeof PairingInvite>;

/*
 * What a connecting Device says inside the completed handshake. Pre-authentication and untrusted: the name is shown for recognition and decides nothing.
 * The Device Key's public half is not here. It is the static key the handshake itself carries, so no Device can claim one it has no private half for.
 */
export const PairingClaim = z.strictObject({
  ticket: z.string().optional(),
  name: z.string(),
  platform: DevicePlatform,
});

export type PairingClaim = z.infer<typeof PairingClaim>;

// The Server's answer: the Device's own row, or why it got none.
export const PairingWelcome = z.discriminatedUnion('paired', [
  z.strictObject({ paired: z.literal(true), deviceId: z.string() }),
  z.strictObject({ paired: z.literal(false), refusal: PairingRefusal }),
]);

export type PairingWelcome = z.infer<typeof PairingWelcome>;

/*
 * What `pairing.mint` hands the pair sheet: the invite the QR carries, and when the Ticket inside it stops being good.
 * The sheet redraws before then, so the code on screen is still valid when the owner finally gets their phone out (ADR-0045).
 */
export const MintedPairingTicket = z.strictObject({
  invite: PairingInvite,
  expiresAt: z.iso.datetime(),
});

export type MintedPairingTicket = z.infer<typeof MintedPairingTicket>;

/*
 * A Device that has just registered with a Ticket the open pair sheet minted, which the sheet names in its prompt.
 * The name and the platform are the Device's own claim: pre-authentication and untrusted, shown for recognition and never used for a decision (ADR-0045).
 */
export const PairingRegistration = z.strictObject({
  deviceId: z.string(),
  claimedName: z.string(),
  claimedPlatform: DevicePlatform,
});

export type PairingRegistration = z.infer<typeof PairingRegistration>;

/*
 * The QR's own bytes: the invite as compact JSON. One writer and one reader, so the Server Device drawing the code and the Device scanning it cannot disagree about the format.
 */
export const writePairingInvite = (invite: PairingInvite): string =>
  JSON.stringify(invite);

// Whatever a camera read, as an invite, or nothing: a scan is untrusted input and most of what a camera sees is not an Argo code at all.
export function readPairingInvite(scanned: string): PairingInvite | undefined {
  try {
    const parsed = PairingInvite.safeParse(JSON.parse(scanned));

    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
