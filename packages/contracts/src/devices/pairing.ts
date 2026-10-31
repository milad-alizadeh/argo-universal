import { z } from 'zod';

// The Pairing Ticket the owner reads off the QR or types in: six digits, as the pair sheet draws it.
export const pairingTicketDigits = 6;

// About two minutes, so a photograph of the screen is not a lasting key (ADR-0045).
export const pairingTicketLifetimeMs = 120_000;

// How many codes may be presented and refused before the outstanding Tickets are revoked and the sheet mints another.
export const pairingTicketAttempts = 10;

/*
 * Why a Server refused to pair with a Device or to recognise one. The App draws `ticket-expired` and `ticket-spent` as "This code has expired" and offers a new one; the rest it cannot resolve by itself.
 * `ticket-required` answers a Device this Server has no row for that brought no Ticket, and `replayed` one that repeats an exchange someone watched.
 */
export const PairingRefusal = z.enum([
  'ticket-required',
  'ticket-unknown',
  'ticket-spent',
  'ticket-expired',
  'ticket-attempts',
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
  platform: z.enum(['macos', 'windows', 'linux', 'ios', 'android']),
});

export type PairingClaim = z.infer<typeof PairingClaim>;

// The Server's answer: the Device's own row, or why it got none.
export const PairingWelcome = z.discriminatedUnion('paired', [
  z.strictObject({ paired: z.literal(true), deviceId: z.string() }),
  z.strictObject({ paired: z.literal(false), refusal: PairingRefusal }),
]);

export type PairingWelcome = z.infer<typeof PairingWelcome>;
