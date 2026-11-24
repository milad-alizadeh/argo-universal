import { describe, expect, it, vi } from 'vitest';
import type { ChannelAddress } from './byte-socket';
import { ChannelRoute, type LocateServer } from './channel-route';
import { PairingRefused } from './open-channel';

const port = 7337;

// An address on the home network, and one on a cable between the phone and the computer.
const lan = (last: number): ChannelAddress => ({
  host: `192.168.1.${last}`,
  port,
});

const cable = (last: number): ChannelAddress => ({
  host: `169.254.116.${last}`,
  port,
});

const kept = lan(20);

const tailnet: ChannelAddress = { host: `100.101.102.${7}`, port };

const unreachable = 'The Server did not answer';

const opened = 'channel';

interface FakeServer {
  attempt: (address: ChannelAddress) => Promise<string>;
  // Every address a channel was opened to, in order.
  tried: ChannelAddress[];
}

// A Server that answers only on `answering`; every other address gives the socket error a phone gets.
function serverOn(...answering: ChannelAddress[]): FakeServer {
  const tried: ChannelAddress[] = [];

  const attempt = async (address: ChannelAddress): Promise<string> => {
    tried.push(address);

    if (answering.some((one) => one.host === address.host)) return opened;
    throw new Error('Operation timed out');
  };

  return { attempt, tried };
}

const announcing = (
  ...addresses: ChannelAddress[]
): ReturnType<typeof vi.fn<LocateServer>> =>
  vi.fn<LocateServer>(async () => addresses);

describe('ChannelRoute', () => {
  it('tries the kept address first, so a phone off the network does not wait for Bonjour to time out', async () => {
    const route = new ChannelRoute(kept, () => new Promise(() => {}));
    const server = serverOn(kept);

    await expect(route.open(server.attempt)).resolves.toBe(opened);
    expect(server.tried).toEqual([kept]);
  });

  it('tries the other kept addresses before Bonjour has answered, off the LAN included', async () => {
    const route = new ChannelRoute(kept, () => new Promise(() => {}), [
      tailnet,
    ]);

    const server = serverOn(tailnet);

    await expect(route.open(server.attempt)).resolves.toBe(opened);
    expect(server.tried).toEqual([kept, tailnet]);
  });

  it('keeps the first kept address that answers, without waiting on a dead one that never does', async () => {
    const route = new ChannelRoute(kept, announcing(), [tailnet]);

    const attempt = async (address: ChannelAddress): Promise<string> =>
      address.host === kept.host
        ? new Promise<string>(() => {})
        : `channel at ${address.host}`;

    await expect(route.open(attempt)).resolves.toBe(
      `channel at ${tailnet.host}`,
    );
  });

  it('closes a channel that opens after another address has already won', async () => {
    const route = new ChannelRoute(kept, announcing(), [tailnet]);
    const discard = vi.fn<(channel: string) => void>();
    const late = Promise.withResolvers<string>();

    const attempt = async (address: ChannelAddress): Promise<string> =>
      address.host === kept.host ? late.promise : 'tailnet channel';

    await route.open(attempt, discard);
    late.resolve('late lan channel');

    await vi.waitFor(() => {
      expect(discard).toHaveBeenCalledWith('late lan channel');
    });
  });

  it('says the Server is unreachable once every kept address has failed', async () => {
    const route = new ChannelRoute(kept, announcing(), [tailnet]);
    const server = serverOn();

    await expect(route.open(server.attempt)).rejects.toThrow(unreachable);
    expect(server.tried).toEqual([kept, tailnet]);
  });

  it('then tries where the Server announces itself now, when none of the kept addresses answers', async () => {
    const now = lan(40);
    const route = new ChannelRoute(kept, announcing(now), [tailnet]);
    const server = serverOn(now);

    await expect(route.open(server.attempt)).resolves.toBe(opened);
    expect(server.tried).toEqual([kept, tailnet, now]);
  });

  it('opens the next channel where the last one answered, without asking the network again', async () => {
    const now = lan(40);
    const locate = announcing(now);
    const route = new ChannelRoute(kept, locate);
    const server = serverOn(now);

    await route.open(server.attempt);
    await route.open(server.attempt);

    expect(locate).toHaveBeenCalledTimes(1);
    expect(server.tried).toEqual([kept, now, now]);
  });

  it('looks for the Server again when the address that answered last stops answering', async () => {
    const before = lan(40);
    const after = lan(41);
    const announced = [before];
    const route = new ChannelRoute(kept, async () => announced);

    await route.open(serverOn(before).attempt);
    announced.splice(0, 1, after);
    const moved = serverOn(after);

    await expect(route.open(moved.attempt)).resolves.toBe(opened);
    expect(moved.tried).toEqual([before, kept, after]);
  });

  it('tries a kept link-local address after every other kept one', async () => {
    const wire = cable(90);
    const route = new ChannelRoute(kept, announcing(), [wire, tailnet]);
    const server = serverOn();

    await expect(route.open(server.attempt)).rejects.toThrow(unreachable);

    expect(server.tried).toEqual([kept, tailnet, wire]);
  });

  it('tries a link-local address last of all, since it answers only while a cable joins the two', async () => {
    const wire = cable(90);
    const wifi = lan(172);
    const route = new ChannelRoute(kept, announcing(wire, wifi));
    const server = serverOn(wire);

    await route.open(server.attempt);

    expect(server.tried).toEqual([kept, wifi, wire]);
  });

  it('tries an address announced twice, or announced and kept, once', async () => {
    const route = new ChannelRoute(kept, announcing(kept, kept));
    const server = serverOn();

    await expect(route.open(server.attempt)).rejects.toThrow(unreachable);
    expect(server.tried).toEqual([kept]);
  });

  it('stops at a Server that answered and refused this Device', async () => {
    const now = lan(40);
    const route = new ChannelRoute(kept, announcing(now));
    const tried: ChannelAddress[] = [];

    const refused = route.open(async (address) => {
      tried.push(address);
      throw new PairingRefused('ticket-required');
    });

    await expect(refused).rejects.toBeInstanceOf(PairingRefused);
    expect(tried).toEqual([kept]);
  });

  it('says the Server is unreachable when no address answers', async () => {
    const route = new ChannelRoute(kept, announcing(lan(40)));

    await expect(route.open(serverOn().attempt)).rejects.toThrow(unreachable);
  });

  it('asks the network once for channels that open together', async () => {
    const locate = announcing(kept);
    const route = new ChannelRoute(kept, locate);
    const server = serverOn(kept);

    await Promise.all([route.open(server.attempt), route.open(server.attempt)]);

    expect(locate).toHaveBeenCalledTimes(1);
  });

  it('tries only the kept address when nothing can look for the Server', async () => {
    const route = new ChannelRoute(kept);
    const server = serverOn(kept);

    await expect(route.open(server.attempt)).resolves.toBe(opened);
    expect(server.tried).toEqual([kept]);
  });
});
