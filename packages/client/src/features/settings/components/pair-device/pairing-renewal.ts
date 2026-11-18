import { pairingTicketLifetimeMs } from '@repo/contracts';

// A code is replaced a little before its Ticket runs out, so the one on screen is still good when the owner finally gets their phone out.
const renewalMargin = 5_000;

// How long one code stays on screen: the Ticket's life, less the margin it is replaced by.
export const codeShownForMs = pairingTicketLifetimeMs - renewalMargin;

// When the open sheet swaps this code for a new one (ADR-0045), as milliseconds since the epoch.
export const renewsAt = (expiresAt: string): number =>
  Date.parse(expiresAt) - renewalMargin;
