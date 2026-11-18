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
 * When it does not answer, the Server is looked for again: every address it announces now, then the one Pairing kept, and the first that proves the key is kept for the next channel.
 */
export class ChannelRoute {
  private proven: ChannelAddress | undefined;
  private locating: Promise<readonly ChannelAddress[]> | undefined;

  public constructor(
    private readonly kept: ChannelAddress,
    private readonly locate: LocateServer = nothingAnnounced,
  ) {}

  public async open<T>(
    attempt: (address: ChannelAddress) => Promise<T>,
  ): Promise<T> {
    const causes: unknown[] = [];

    for await (const address of this.candidates()) {
      const result = await this.tryAt(address, attempt, causes);

      if (result) return result.channel;
    }

    throw new ServerUnreachable(causes);
  }

  // The network is asked only once the address that answered last does not.
  private async *candidates(): AsyncGenerator<ChannelAddress> {
    const last = this.proven;

    if (last) yield last;
    yield* (await this.located()).filter(differentFrom(last));
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

  private async located(): Promise<ChannelAddress[]> {
    this.locating ??= this.lookAgain();

    return inOrder([...(await this.locating), this.kept]);
  }

  // Channels that open together share one look at the network; one that fails is as if nothing announced the Server.
  private lookAgain(): Promise<readonly ChannelAddress[]> {
    return this.locate()
      .catch(() => [])
      .finally(() => {
        this.locating = undefined;
      });
  }
}

// A Server that answered and refused this Device is the Server: no other address would say otherwise.
function throwIfRefused(cause: unknown): void {
  if (cause instanceof PairingRefused) throw cause;
}
