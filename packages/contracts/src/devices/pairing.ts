import { z } from 'zod';
import { DevicePlatform } from './device';

/*
 * The Pairing Ticket the owner reads off the QR or types in: six digits.
 * Six digits are about 20 bits, which anyone could try in full offline, so a typed code is never checked against anything a watcher can record. It is the password of a password-authenticated key exchange (`pake`), where each wrong guess takes a whole run against the Server and is counted against its source (ADR-0045).
 */
export const pairingTicketLength = 6;

export const pairingTicketAlphabet = '0123456789';

const groupLength = pairingTicketLength / 2;

// The Ticket as it is drawn for reading aloud: two groups of three.
export const formatPairingTicket = (ticket: string): string =>
  `${ticket.slice(0, groupLength)}-${ticket.slice(groupLength)}`;

const ticketPattern = new RegExp(`^[0-9]{${pairingTicketLength}}$`);

// What the owner typed, as a Ticket, or nothing when it cannot be one. Spaces, dashes and dots are free, so a code read aloud and typed back loses nothing to the way it was said.
export function readTypedTicket(typed: string): string | undefined {
  const ticket = typed.replaceAll(/[\s\-·.]/g, '');

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
  // Where the Server answers, as `http://host:port` URLs, most likely first: a Device knocks there before it looks for the Server on the network, as Expo's dev server puts its URL in its code. Absent from a code drawn before Servers wrote it.
  urls: z.array(z.string()).optional(),
});

export type PairingInvite = z.infer<typeof PairingInvite>;

/*
 * The path a Device opens its channel at, as a WebSocket on the Server's one port (ADR-0045). The Noise handshake inside it is still the only gate; the WebSocket only carries its bytes, so the channel crosses anything that carries HTTP, such as a tailnet.
 */
export const channelPath = '/channel';

// Raw deflate (RFC 1951), each record alone with no dictionary carried over.
export const ChannelCompression = z.literal('deflate-raw');

export type ChannelCompression = z.infer<typeof ChannelCompression>;

/*
 * What a connecting Device says inside the completed handshake. Pre-authentication and untrusted: the name is shown for recognition and decides nothing.
 * The Device Key's public half is not here. It is the static key the handshake itself carries, so no Device can claim one it has no private half for.
 */
export const PairingClaim = z.strictObject({
  ticket: z.string().optional(),
  name: z.string(),
  platform: DevicePlatform,
  // Offered by an App that can inflate: the Server may then compress what it sends (ADR-0045, amended 2026-11-24). Absent from an App built before it, which is sent every record as it is.
  compression: ChannelCompression.optional(),
});

export type PairingClaim = z.infer<typeof PairingClaim>;

// The Server's answer: the Device's own row, or why it got none.
export const PairingWelcome = z.discriminatedUnion('paired', [
  z.strictObject({
    paired: z.literal(true),
    deviceId: z.string(),
    // Present only when the App offered compression and the Server agreed: every record the channel carries then opens with a byte that says whether the rest is deflated.
    compression: ChannelCompression.optional(),
  }),
  z.strictObject({ paired: z.literal(false), refusal: PairingRefusal }),
]);

export type PairingWelcome = z.infer<typeof PairingWelcome>;

// What the Server seals into its handshake answer when the owner's Allow prompt is up and the owner has not yet answered; the welcome then follows as the channel's first record (ADR-0045).
export const PairingAsked = z.strictObject({ asked: z.literal(true) });

export const PairingAnswer = z.union([PairingWelcome, PairingAsked]);

export type PairingAnswer = z.infer<typeof PairingAnswer>;

/*
 * What `pairing.mint` hands the pair sheet: the invite the QR carries, and when the Ticket inside it stops being good.
 * The sheet redraws before then, so the code on screen is still valid when the owner finally gets their phone out (ADR-0045).
 */
export const MintedPairingTicket = z.strictObject({
  invite: PairingInvite,
  expiresAt: z.iso.datetime(),
  // Where this computer answers on its networks, one `host:port` each, which the sheet shows beside the code for a Device that cannot find it by itself (#1490, Enter code). Empty when it is on no network.
  addresses: z.array(z.string()),
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
 * The QR's own bytes: the invite as compact ASCII JSON. Escape Unicode because the QR encoder's default Byte mode truncates each UTF-16 code unit to one byte; even a curly apostrophe in the Server name would become an invalid JSON control character. JSON parsing restores the original name, including surrogate pairs.
 */
const hexadecimal = 16;

const unicodeEscapeLength = 4;

export const writePairingInvite = (invite: PairingInvite): string =>
  JSON.stringify(invite).replaceAll(
    /[\u0080-\uffff]/g,
    (character) =>
      `\\u${character.charCodeAt(0).toString(hexadecimal).padStart(unicodeEscapeLength, '0')}`,
  );

// Whatever a camera read, as an invite, or nothing: a scan is untrusted input and most of what a camera sees is not an Argo code at all.
export function readPairingInvite(scanned: string): PairingInvite | undefined {
  try {
    const parsed = PairingInvite.safeParse(JSON.parse(scanned));

    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}
