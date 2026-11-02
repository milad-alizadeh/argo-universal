import { type DiscoveredServer, readTypedTicket } from '@repo/contracts';
import type { requestServerKey } from '#features/connection';
import { heardServers, type Timing } from './hear-servers';
import { pairAtAddress } from './pair-at-address';
import {
  type PairDeps,
  type PairOutcome,
  pairWithInvite,
} from './pair-with-invite';
import { readTypedAddress } from './typed-address';
import {
  type Asked,
  Refused,
  type TypedOutcome,
  verdict,
} from './typed-verdict';

export type { TypedOutcome } from './typed-verdict';

export interface TypedDeps extends PairDeps {
  requestKey: typeof requestServerKey;
  // How long to wait for the first Server to announce itself, and how much longer for the rest once one has.
  timeoutMs?: number;
  settleMs?: number;
  // Called with the name of the Server that knew the code, before the wait on its owner begins, so the page can say whose approval it is waiting for.
  onFound?: (serverName: string) => void;
  // What the owner typed in the Address field: `host:port` is the place to knock with no discovery at all, and a bare name or address is tried first among the addresses discovery gave, for a network that announces a name but not where it is.
  host?: string;
}

const defaultTimeoutMs = 3000;

const defaultSettleMs = 300;

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

// The owner's own address first, then what the Server announced.
const hostsOf = (server: DiscoveredServer, deps: TypedDeps): string[] =>
  deps.host ? [deps.host, ...server.addresses] : [...server.addresses];

async function askServer(
  server: DiscoveredServer,
  asking: { ticket: string; deps: TypedDeps },
): Promise<Asked> {
  for (const host of hostsOf(server, asking.deps)) {
    const asked = await askAt(server, host, asking);

    if (asked) return asked;
  }

  return { kind: 'silent' };
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

  return ticket ? pairWithTicket(ticket, deps) : { kind: 'mistyped' };
}

// An address with a port is the Server asked for; otherwise each Server discovery heard is asked in turn.
async function pairWithTicket(
  ticket: string,
  deps: TypedDeps,
): Promise<TypedOutcome> {
  const at = readTypedAddress(deps.host);

  if (at) return pairAtAddress(ticket, at, deps);
  const found = await findServer(ticket, deps);

  return 'key' in found ? pairFound(found, ticket, deps) : found;
}
