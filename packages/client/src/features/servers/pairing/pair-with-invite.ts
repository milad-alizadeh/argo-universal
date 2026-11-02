import { type PairingInvite, PairingRefusal } from '@repo/contracts';
import { z } from 'zod';
import type {
  BrowseServers,
  KnownServer,
  pairWithServer,
  resolveServer,
  ServerAddress,
} from '#features/connection';

/*
 * How one try at pairing ended. Each has its own page, because each needs the owner to do something different (ADR-0045):
 * an expired code needs a new one, a No needs a new scan, silence needs the other computer awake, and no answer on the network needs a computer that is on it.
 */
export type PairOutcome =
  | { kind: 'paired'; server: KnownServer }
  | { kind: 'expired' }
  | { kind: 'declined' }
  | { kind: 'unanswered' }
  | { kind: 'not-found' }
  | { kind: 'failed' };

// The ways that have a page of their own; a `failed` one is only a toast, and the scanner stays.
export type PairFailure = Exclude<PairOutcome, { kind: 'paired' | 'failed' }>;

// The Server's own words, as the owner reads them. A spent, expired or unknown Ticket is one thing to the owner: that code is no good.
const refusals: Record<PairingRefusal, PairOutcome> = {
  'ticket-expired': { kind: 'expired' },
  'ticket-spent': { kind: 'expired' },
  'ticket-unknown': { kind: 'expired' },
  'ticket-attempts': { kind: 'expired' },
  declined: { kind: 'declined' },
  unanswered: { kind: 'unanswered' },
  'ticket-required': { kind: 'failed' },
  replayed: { kind: 'failed' },
};

export interface PairDeps {
  // Where each piece comes from, so the logic here is the same on a phone and under test: the platform's browser for Servers, the handshake that spends the Ticket, and the lookup of where the Server is now.
  browse: BrowseServers | null;
  pair: typeof pairWithServer;
  resolve: typeof resolveServer;
  signal?: AbortSignal;
  // Where to knock when nothing announces the Server; a hint the handshake still has to prove.
  address?: ServerAddress;
}

type Located = Awaited<ReturnType<typeof resolveServer>>;

// What one try at pairing is about: the code, where its Server answers now, and where everything comes from.
interface Attempt {
  invite: PairingInvite;
  located: Located;
  deps: PairDeps;
}

// What `PairingRefused` carries; read by shape because the class lives behind the connection feature's index.
const Refused = z.object({ refusal: PairingRefusal });

const refusalOutcome = (cause: unknown): PairOutcome | null => {
  const refused = Refused.safeParse(cause);

  return refused.success ? refusals[refused.data.refusal] : null;
};

const pairedAt = (host: string, attempt: Attempt): PairOutcome => ({
  kind: 'paired',
  server: {
    name: attempt.located.name,
    key: attempt.invite.key,
    address: { host, port: attempt.located.port },
  },
});

// One address. One that does not answer is not a refusal, so it gives nothing and the next may be the Server.
async function tryHost(
  host: string,
  attempt: Attempt,
): Promise<PairOutcome | null> {
  const { invite, located, deps } = attempt;
  const endpoint = { host, port: located.port, serverPublicKey: invite.key };

  try {
    await deps.pair(endpoint, invite.ticket, { signal: deps.signal });

    return pairedAt(host, attempt);
  } catch (cause) {
    return refusalOutcome(cause);
  }
}

// The first address the Server answers on.
async function pairOnAny(attempt: Attempt): Promise<PairOutcome> {
  for (const host of attempt.located.hosts) {
    const outcome = await tryHost(host, attempt);

    if (outcome) return outcome;
  }

  return { kind: 'not-found' };
}

const knownOf = (invite: PairingInvite, deps: PairDeps): KnownServer => ({
  name: invite.server,
  key: invite.key,
  address: deps.address,
});

/*
 * Pairs with the Server a scanned code names: finds where it is now, spends the Ticket on a channel to it, and waits for the owner's answer on the Server Device.
 * The Server is found by its key's hash and not by the name, so a Server renamed since the code was drawn is still the one (ADR-0045).
 */
export async function pairWithInvite(
  invite: PairingInvite,
  deps: PairDeps,
): Promise<PairOutcome> {
  try {
    const located = await deps.resolve(knownOf(invite, deps), deps.browse);

    return await pairOnAny({ invite, located, deps });
  } catch {
    return { kind: 'not-found' };
  }
}
