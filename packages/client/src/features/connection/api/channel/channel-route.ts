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
    discard: (channel: T) => void = () => {},
  ): Promise<T> {
    const causes: unknown[] = [];
    const last = this.proven;

    if (last) {
      const result = await this.tryAt(last, attempt, causes);

      if (result) return result.channel;
    }

    const announcing = this.lookAgain();
    const kept = inOrder([this.keptAddress, ...this.otherKeptAddresses]);
    const direct = kept.filter(differentFrom(last)).filter((a) => !linkLocal(a));
    const first = await this.race(direct, attempt, discard, causes);

    if (first) return first.channel;
    const asked = new Set([last, ...direct].map((a) => a && keyOf(a)));
    const everywhere = inOrder([...kept, ...(await announcing)]);

    for (const address of everywhere.filter((a) => !asked.has(keyOf(a)))) {
      const result = await this.tryAt(address, attempt, causes);

      if (result) return result.channel;
    }

    throw new ServerUnreachable(causes);
  }

  // The addresses Pairing kept are asked together: a stale home address that never answers must not hold up the tailnet one. The first to prove the key wins; one that answers later is closed.
  private async race<T>(
    addresses: readonly ChannelAddress[],
    attempt: (address: ChannelAddress) => Promise<T>,
    discard: (channel: T) => void,
    causes: unknown[],
  ): Promise<{ channel: T } | undefined> {
    if (addresses.length === 0) return undefined;

    return new Promise((resolve, reject) => {
      let won = false;
      let pending = addresses.length;

      for (const address of addresses) {
        this.tryAt(address, attempt, causes).then(
          (result) => {
            pending -= 1;

            if (result && won) discard(result.channel);
            else if (result) {
              won = true;
              resolve(result);
            } else if (pending === 0 && !won) resolve(undefined);
          },
          (cause: unknown) => {
            pending -= 1;
            if (!won) reject(cause as Error);
            won = true;
          },
        );
      }
    });
  }

  private async tryAt<T>(
    address: ChannelAddress,
    attempt: (address: ChannelAddress) => Promise<T>,
    causes: unknown[],
  ): Promise<{ channel: T } | undefined> {
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
