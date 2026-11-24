import type { ChannelAddress } from './byte-socket';
import { PairingRefused } from './open-channel';

// Every address a paired Server announces itself on now, or none when nothing announces it.
export type LocateServer = () => Promise<readonly ChannelAddress[]>;

// No address the Server could be at answered: it is off, asleep or on another network. The Connection draws that, so it is not a fault to report.
export class ServerUnreachable extends Error {
  public constructor(public readonly causes: readonly unknown[]) {
    super('The Server did not answer on any address it could be at');
    this.name = 'ServerUnreachable';
  }
}

// A link-local address answers only while a cable joins the two Devices, so it is tried after every other.
const linkLocal = (address: ChannelAddress): boolean =>
  address.host.startsWith('169.254.');

const keyOf = (address: ChannelAddress): string =>
  `${address.host}:${address.port}`;

function inOrder(addresses: readonly ChannelAddress[]): ChannelAddress[] {
  const unique = [
    ...new Map(addresses.map((address) => [keyOf(address), address])).values(),
  ];

  return [
    ...unique.filter((address) => !linkLocal(address)),
    ...unique.filter(linkLocal),
  ];
}

interface Opened<T> {
  channel: T;
}

const nothingAnnounced: LocateServer = async () => [];

const differentFrom =
  (skip: ChannelAddress | undefined) =>
  (address: ChannelAddress): boolean =>
    skip === undefined || keyOf(address) !== keyOf(skip);

/*
 * Where a paired Server's channels open (ADR-0045). The address that last proved the Server's key is tried first, so a channel per Blob does not ask the network each time.
 * When it does not answer, the network is asked while the addresses Pairing kept are tried, so a phone off the local network, where Bonjour only ever times out, is not held up by it. Then what the Server announces now is tried, and the first address that proves the key is kept for the next channel.
 */
export class ChannelRoute {
  private proven: ChannelAddress | undefined;
  private locating: Promise<readonly ChannelAddress[]> | undefined;

  public constructor(
    private readonly keptAddress: ChannelAddress,
    private readonly locate: LocateServer = nothingAnnounced,
    private readonly otherKeptAddresses: readonly ChannelAddress[] = [],
  ) {}

  public async open<T>(
    attempt: (address: ChannelAddress) => Promise<T>,
    discard: (channel: T) => void,
  ): Promise<T> {
    const causes: unknown[] = [];

    const tryAt = (address: ChannelAddress): Promise<Opened<T> | undefined> =>
      this.tryAt(address, attempt, causes);

    for await (const stage of this.stages()) {
      const result = await firstOf(stage.map(tryAt), discard);

      if (result) return result.channel;
    }

    throw new ServerUnreachable(causes);
  }

  // Each stage is asked together; the next is asked only when none of it answered. The kept addresses go in one stage, so a stale home address that never answers does not hold up the tailnet one.
  private async *stages(): AsyncGenerator<ChannelAddress[]> {
    const last = this.proven;

    if (last) yield [last];
    const announcing = this.lookAgain();

    const kept = inOrder([this.keptAddress, ...this.otherKeptAddresses]);

    const direct = kept
      .filter(differentFrom(last))
      .filter((a) => !linkLocal(a));

    yield direct;
    const asked = new Set([last, ...direct].map((a) => a && keyOf(a)));
    const everywhere = inOrder([...kept, ...(await announcing)]);

    for (const address of everywhere.filter((a) => !asked.has(keyOf(a)))) {
      yield [address];
    }
  }

  private async tryAt<T>(
    address: ChannelAddress,
    attempt: (address: ChannelAddress) => Promise<T>,
    causes: unknown[],
  ): Promise<Opened<T> | undefined> {
    try {
      const channel = await attempt(address);

      this.proven = address;

      return { channel };
    } catch (cause) {
      throwIfRefused(cause);
      causes.push(cause);

      return undefined;
    }
  }

  // Channels that open together share one look at the network; one that fails is as if nothing announced the Server.
  private lookAgain(): Promise<readonly ChannelAddress[]> {
    this.locating ??= this.locate()
      .catch(() => [])
      .finally(() => {
        this.locating = undefined;
      });

    return this.locating;
  }
}

// A Server that answered and refused this Device is the Server: no other address would say otherwise.
function throwIfRefused(cause: unknown): void {
  if (cause instanceof PairingRefused) throw cause;
}

// The first attempt to open wins and the rest are let go: one that opens later is discarded. A Server that refused this Device ends the race at once, whatever the other addresses are still doing. When none opens, there is no winner.
async function firstOf<T>(
  tries: readonly Promise<Opened<T> | undefined>[],
  discard: (channel: T) => void,
): Promise<Opened<T> | undefined> {
  const refusal = Promise.withResolvers<never>();

  const opens = tries.map(async (attempt) => {
    const opened = await attempt.catch((cause: unknown) => {
      refusal.reject(cause);
      throw cause;
    });

    if (!opened) throw new Error('Did not open');

    return opened;
  });

  try {
    const winner = await Promise.race([Promise.any(opens), refusal.promise]);

    for (const attempt of tries) {
      void attempt.then((opened) => {
        if (opened && opened !== winner) discard(opened.channel);
      });
    }

    return winner;
  } catch (cause) {
    if (cause instanceof AggregateError) return;
    throw cause;
  }
}
