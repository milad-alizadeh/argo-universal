import { type PairingInvite, PairingRefusal } from '@repo/contracts';
import { z } from 'zod';
import type {
  BrowseServers,
  KnownServer,
  pairWithServer,
  resolveServer,
  ServerAddress,
} from '#features/connection';
import { directAddresses, keyOf, otherAddressesOf } from './invite-addresses';

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
  // The first look at the network heard nothing, which is no proof the Server is away: a Local Network prompt may have been answered after the wait ended.
  | { kind: 'undetermined' }
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
}

// What `PairingRefused` carries; read by shape because the class lives behind the connection feature's index.
const Refused = z.object({ refusal: PairingRefusal });

const refusalOutcome = (cause: unknown): PairOutcome | null => {
  const refused = Refused.safeParse(cause);

  return refused.success ? refusals[refused.data.refusal] : null;
};

// One try at pairing: the code, the name the Server goes by, and where everything comes from.
interface Attempt {
  invite: PairingInvite;
  name: string;
  deps: PairDeps;
}

function pairedAt(address: ServerAddress, attempt: Attempt): PairOutcome {
  const { invite, name } = attempt;
  const server: KnownServer = { name, key: invite.key, address };
  const others = otherAddressesOf(invite, address);

  if (others.length > 0) server.otherAddresses = others;

  return { kind: 'paired', server };
}

// Spends the Ticket on a channel to one address.
const spend = (
  address: ServerAddress,
  { invite, deps }: Attempt,
): ReturnType<PairDeps['pair']> =>
  deps.pair({ ...address, serverPublicKey: invite.key }, invite.ticket, {
    signal: deps.signal,
    onReached: deps.onReached,
  });

// One address. One that does not answer is not a refusal, so it gives nothing and the next may be the Server.
async function tryAt(
  address: ServerAddress,
  attempt: Attempt,
): Promise<PairOutcome | null> {
  try {
    await spend(address, attempt);

    return pairedAt(address, attempt);
  } catch (cause) {
    return refusalOutcome(cause);
  }
}

// The first address the Server answers on, or null when none does.
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

interface Announced {
  name: string;
  addresses: ServerAddress[];
  undetermined?: true;
}

const isUndetermined = (cause: unknown): boolean =>
  cause instanceof Error && cause.name === 'BrowseUndeterminedError';

const nothingHeard = (invite: PairingInvite, cause: unknown): Announced =>
  isUndetermined(cause)
    ? { name: invite.server, addresses: [], undetermined: true }
    : { name: invite.server, addresses: [] };

type Located = Awaited<ReturnType<PairDeps['resolve']>>;

// Where the Server was heard, less where it was already knocked on.
function unvisited(
  located: Located,
  tried: readonly ServerAddress[],
): ServerAddress[] {
  const skip = new Set(tried.map(keyOf));

  return located.hosts
    .map((host) => ({ host, port: located.port }))
    .filter((address) => !skip.has(keyOf(address)));
}

// Where the Server announces itself now, less where it was already knocked on; none when it is not heard.
async function announcedAt(
  { invite, deps }: Attempt,
  tried: readonly ServerAddress[],
): Promise<Announced> {
  try {
    const known = { name: invite.server, key: invite.key };
    const located = await deps.resolve(known, deps.browse);

    return { name: located.name, addresses: unvisited(located, tried) };
  } catch (cause) {
    return nothingHeard(invite, cause);
  }
}

// Looks for the Server on the network and knocks where it is heard; what no answer means depends on whether anything could be heard at all.
async function afterAnnouncement(
  attempt: Attempt,
  tried: readonly ServerAddress[],
): Promise<PairOutcome> {
  const announced = await announcedAt(attempt, tried);

  const outcome = await pairOnAny(announced.addresses, {
    ...attempt,
    name: announced.name,
  });

  return (
    outcome ?? { kind: announced.undetermined ? 'undetermined' : 'not-found' }
  );
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
  const direct = directAddresses(invite, deps.address);

  return (
    (await pairOnAny(direct, attempt)) ?? afterAnnouncement(attempt, direct)
  );
}
