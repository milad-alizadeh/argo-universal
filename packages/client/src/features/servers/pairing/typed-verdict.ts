import { type DiscoveredServer, PairingRefusal } from '@repo/contracts';
import { z } from 'zod';
import type { ServerAddress } from '#features/connection';
import type { PairOutcome } from './pair-with-invite';

// How one try at pairing with a typed code ended. The ways a scanned code can end are the same; a typed one can also be wrong where a scanned one cannot be, and a Server can turn the source away for being wrong too often.
export type TypedOutcome =
  | PairOutcome
  | { kind: 'mistyped' }
  | { kind: 'turned-away' };

// What `PairingRefused` carries, read by shape as in `pair-with-invite.ts`.
export const Refused = z.object({ refusal: PairingRefusal });

export type Asked =
  | { kind: 'key'; key: string; server: DiscoveredServer; at: ServerAddress }
  | { kind: 'refused'; refusal: PairingRefusal }
  | { kind: 'silent' };

// A Server that holds the code and will not pair with it says so, and that is the answer: the code is no good, or this source has been wrong too often.
const decisive: Partial<Record<PairingRefusal, TypedOutcome>> = {
  'ticket-expired': { kind: 'expired' },
  'ticket-spent': { kind: 'expired' },
  'ticket-attempts': { kind: 'turned-away' },
};

// Every Server that answered said the code is not its own: it was typed wrong. Nobody answering is a network that does not have the Server on it.
export function verdict(answers: readonly Asked[]): TypedOutcome {
  const refusals = answers.flatMap((a) =>
    a.kind === 'refused' ? [a.refusal] : [],
  );

  const ended = refusals.map((refusal) => decisive[refusal]).find(Boolean);

  return ended ?? { kind: refusals.length > 0 ? 'mistyped' : 'not-found' };
}
