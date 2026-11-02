import {
  type DiscoveredServer,
  PairingRefusal,
  readTypedTicket,
} from '@repo/contracts';
import { z } from 'zod';
import type { requestServerKey, ServerAddress } from '#features/connection';
import { heardServers, type Timing } from './hear-servers';
import {
  type PairDeps,
  type PairOutcome,
  pairWithInvite,
} from './pair-with-invite';

// How one try at pairing with a typed code ended. The ways a scanned code can end are the same; a typed one can also be wrong where a scanned one cannot be, and a Server can turn the source away for being wrong too often.
export type TypedOutcome =
  | PairOutcome
  | { kind: 'mistyped' }
  | { kind: 'turned-away' };

export interface TypedDeps extends PairDeps {
  requestKey: typeof requestServerKey;
  // How long to wait for the first Server to announce itself, and how much longer for the rest once one has.
  timeoutMs?: number;
  settleMs?: number;
  // Called with the name of the Server that knew the code, before the wait on its owner begins, so the page can say whose approval it is waiting for.
  onFound?: (serverName: string) => void;
}

const defaultTimeoutMs = 3000;

const defaultSettleMs = 300;

// What `PairingRefused` carries, read by shape as in `pair-with-invite.ts`.
const Refused = z.object({ refusal: PairingRefusal });

type Asked =
  | { kind: 'key'; key: string; server: DiscoveredServer; at: ServerAddress }
  | { kind: 'refused'; refusal: PairingRefusal }
  | { kind: 'silent' };

// One address of one Server: a refusal is its answer, and an address that does not answer is only the wrong address.
async function askAt(
  server: DiscoveredServer,
  host: string,
  { ticket, deps }: { ticket: string; deps: TypedDeps },
): Promise<Asked | undefined> {
  const at = { host, port: server.port };

  try {
    return { kind: 'key', key: await deps.requestKey(at, ticket), server, at };
  } catch (cause) {
    const refused = Refused.safeParse(cause);

    return refused.success
      ? { kind: 'refused', refusal: refused.data.refusal }
      : undefined;
  }
}

async function askServer(
  server: DiscoveredServer,
  asking: { ticket: string; deps: TypedDeps },
): Promise<Asked> {
  for (const host of server.addresses) {
    const asked = await askAt(server, host, asking);

    if (asked) return asked;
  }

  return { kind: 'silent' };
}

// A Server that holds the code and will not pair with it says so, and that is the answer: the code is no good, or this source has been wrong too often.
const decisive: Partial<Record<PairingRefusal, TypedOutcome>> = {
  'ticket-expired': { kind: 'expired' },
  'ticket-spent': { kind: 'expired' },
  'ticket-attempts': { kind: 'turned-away' },
};

// Every Server that answered said the code is not its own: it was typed wrong. Nobody answering is a network that does not have the Server on it.
function verdict(answers: readonly Asked[]): TypedOutcome {
  const refusals = answers.flatMap((a) =>
    a.kind === 'refused' ? [a.refusal] : [],
  );

  const ended = refusals.map((refusal) => decisive[refusal]).find(Boolean);

  return ended ?? { kind: refusals.length > 0 ? 'mistyped' : 'not-found' };
}

const isKey = (asked: Asked): asked is Extract<Asked, { kind: 'key' }> =>
  asked.kind === 'key';

// Asks each Server in turn, and stops at the one that knows the code.
async function askEach(
  servers: readonly DiscoveredServer[],
  asking: { ticket: string; deps: TypedDeps },
): Promise<Asked[]> {
  const answers: Asked[] = [];

  for (const server of servers) {
    const asked = await askServer(server, asking);

    answers.push(asked);

    if (isKey(asked)) break;
  }

  return answers;
}

const timingOf = ({
  timeoutMs = defaultTimeoutMs,
  settleMs = defaultSettleMs,
}: TypedDeps): Timing => ({ timeoutMs, settleMs });

// The Server that knows the code is the Server the owner meant; if none does, the answers say why.
async function findServer(
  ticket: string,
  deps: TypedDeps,
): Promise<Extract<Asked, { kind: 'key' }> | TypedOutcome> {
  const servers = await heardServers(deps.browse, timingOf(deps));

  const answers = await askEach(servers, { ticket, deps });

  return answers.find(isKey) ?? verdict(answers);
}

function pairFound(
  found: Extract<Asked, { kind: 'key' }>,
  ticket: string,
  deps: TypedDeps,
): Promise<PairOutcome> {
  deps.onFound?.(found.server.name);

  return pairWithInvite(
    { key: found.key, server: found.server.name, ticket },
    { ...deps, address: found.at },
  );
}

/*
 * Pairs with the Server a typed code belongs to (ADR-0045). The QR carries the Server's key; a code someone types cannot, so the key is asked for with the code, which only a computer that was told it can answer, and what follows is the scanned flow from the key onward: the same Ticket, spent in the same handshake, and waiting on the same Allow on the Server Device.
 * No Server is named, because the code is what says which one: each Server on the network is asked in turn, and the one that knows it answers.
 */
export async function pairWithTypedCode(
  typed: string,
  deps: TypedDeps,
): Promise<TypedOutcome> {
  const ticket = readTypedTicket(typed);

  if (!ticket) return { kind: 'mistyped' };
  const found = await findServer(ticket, deps);

  return 'key' in found ? pairFound(found, ticket, deps) : found;
}
