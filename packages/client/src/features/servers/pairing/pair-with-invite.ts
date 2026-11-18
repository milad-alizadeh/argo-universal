import { type PairingInvite, PairingRefusal } from '@repo/contracts';
import { z } from 'zod';
import type {
  BrowseServers,
  KnownServer,
  pairWithServer,
  resolveServer,
  ServerAddress,
} from '#features/connection';
import { announcedAt } from './announced-at';
import { addressesToKnockOn, otherQrAddresses } from './qr-addresses';

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
  // The first look at the network heard nothing (ADR-0045).
  | { kind: 'undetermined' }
  // The owner turned Local Network off for the App, so the network cannot be looked at.
  | { kind: 'denied' }
  // This build never declared that it browses for Servers, which iOS refuses without; a fault of the build, not of the network.
  | { kind: 'misconfigured' }
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
  // Where to knock besides the URLs the code carries; a hint the handshake still has to prove.
  address?: ServerAddress;
  // Something answered at an address and has the request: from here the wait is the owner's on the Server Device.
  onReached?: () => void;
  // Fires when an address fails after the socket opened.
  onUnreached?: () => void;
  // The first look at the network since the page opened (ADR-0045).
  firstBrowse?: boolean;
  // Whether this build declares that it browses for Servers. Unset reads as declared.
  declared?: boolean;
}

// What `PairingRefused` carries; read by shape because the class lives behind the connection feature's index.
const Refused = z.object({ refusal: PairingRefusal });

const refusalOutcome = (cause: unknown): PairOutcome | null => {
  const refused = Refused.safeParse(cause);

  return refused.success ? refusals[refused.data.refusal] : null;
};

interface Attempt {
  invite: PairingInvite;
  name: string;
  deps: PairDeps;
}

function pairedAt(address: ServerAddress, attempt: Attempt): PairOutcome {
  const { invite, name } = attempt;
  const otherAddresses = otherQrAddresses(invite, address);

  return {
    kind: 'paired',
    server: {
      name,
      key: invite.key,
      address,
      ...(otherAddresses.length > 0 && { otherAddresses }),
    },
  };
}

const spendTicketAt = (
  address: ServerAddress,
  { invite, deps }: Attempt,
): ReturnType<PairDeps['pair']> =>
  deps.pair({ ...address, serverPublicKey: invite.key }, invite.ticket, {
    signal: deps.signal,
    onReached: deps.onReached,
  });

// An address that does not answer is not a refusal: it gives nothing, and the next may be the Server.
async function tryAt(
  address: ServerAddress,
  attempt: Attempt,
): Promise<PairOutcome | null> {
  try {
    await spendTicketAt(address, attempt);

    return pairedAt(address, attempt);
  } catch (cause) {
    attempt.deps.onUnreached?.();

    return refusalOutcome(cause);
  }
}

async function pairOnAny(
  addresses: readonly ServerAddress[],
  attempt: Attempt,
): Promise<PairOutcome | null> {
  for (const address of addresses) {
    const outcome = await tryAt(address, attempt);

    if (outcome) return outcome;
  }

  return null;
}

async function afterAnnouncement(
  attempt: Attempt,
  alreadyKnockedOn: readonly ServerAddress[],
): Promise<PairOutcome> {
  const announced = await announcedAt(attempt, alreadyKnockedOn);

  if (!announced.heard) return unheard(announced.denied, attempt.deps);

  const outcome = await pairOnAny(announced.addresses, {
    ...attempt,
    name: announced.name,
  });

  return outcome ?? { kind: 'not-found' };
}

// Why nothing was heard, the most certain first: a build that cannot browse, then a refusal by the system, then plain silence.
function unheard(denied: boolean, deps: PairDeps): PairOutcome {
  const causes: [boolean, PairOutcome][] = [
    [deps.declared === false, { kind: 'misconfigured' }],
    [denied, { kind: 'denied' }],
    [deps.firstBrowse === true, { kind: 'undetermined' }],
  ];

  return causes.find(([applies]) => applies)?.[1] ?? { kind: 'not-found' };
}

/*
 * Pairs with the Server a scanned code names, the way a phone reaches an Expo dev server: it knocks first where the code says the Server answers, and looks for it on the network only when nothing answers there.
 * Either way the Ticket is spent on a channel to it, and the wait is for the owner's answer on the Server Device. On the network the Server is found by its key's hash and not by the name, so a Server renamed since the code was drawn is still the one (ADR-0045).
 */
export async function pairWithInvite(
  invite: PairingInvite,
  deps: PairDeps,
): Promise<PairOutcome> {
  const attempt = { invite, name: invite.server, deps };
  const direct = addressesToKnockOn(invite, deps.address);

  return (
    (await pairOnAny(direct, attempt)) ?? afterAnnouncement(attempt, direct)
  );
}
