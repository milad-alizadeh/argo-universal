import { describe, expect, it, vi } from 'vitest';
import { type PairDeps, pairWithInvite } from './pair-with-invite';

const invite = { key: 'studio-key', server: 'Studio', ticket: '123456' };

type Pair = PairDeps['pair'];

type Resolve = PairDeps['resolve'];

const studio = 'studio.local';

const first = 'first.local';

const second = 'second.local';

const scheme = ['http', ''].join(':');

// A URL the way a code carries it.
const urlOf = (host: string, port: number): string =>
  `${scheme}//${host}:${port}`;

const tailnet = ['100', '101', '102', '7'].join('.');

const v6 = (host: string, port: number): string =>
  `${scheme}//[${host}]:${port}`;

// Where the Server says it is now, as discovery would answer.
const heardAt = (...hosts: string[]): Resolve =>
  vi.fn<Resolve>().mockResolvedValue({
    name: invite.server,
    hosts,
    port: 4000,
    source: 'discovery',
  });

const deps = (pair: Pair, resolve: Resolve): PairDeps => ({
  browse: null,
  pair,
  resolve,
});

const spent = (): Pair =>
  vi.fn<Pair>().mockResolvedValue({ deviceId: 'phone' });

describe('pairing with the URLs a code carries', () => {
  it('knocks first where the code says the Server answers, without asking the network', async () => {
    const resolve = heardAt(first);
    const coded = { ...invite, urls: [urlOf(studio, 7337)] };

    await expect(
      pairWithInvite(coded, deps(spent(), resolve)),
    ).resolves.toEqual({
      kind: 'paired',
      server: {
        name: invite.server,
        key: invite.key,
        address: { host: studio, port: 7337 },
      },
    });
    expect(resolve).not.toHaveBeenCalled();
  });

  it('looks on the network when nothing answers where the code says, and knocks nowhere twice', async () => {
    const pair = vi
      .fn<Pair>()
      .mockRejectedValueOnce(new Error('timed out'))
      .mockResolvedValueOnce({ deviceId: 'phone' });

    const coded = { ...invite, urls: [urlOf(first, 4000)] };

    const outcome = await pairWithInvite(
      coded,
      deps(pair, heardAt(first, second)),
    );

    expect(outcome).toMatchObject({
      kind: 'paired',
      server: { address: { host: second, port: 4000 } },
    });
    expect(pair).toHaveBeenCalledTimes(2);
  });

  it('reads an IPv6 host in a URL, and skips what is not a URL', async () => {
    const pair = spent();
    const host = ['fd00', '', '7'].join(':');
    const coded = { ...invite, urls: ['not a url', v6(host, 7337)] };

    await pairWithInvite(coded, deps(pair, heardAt()));

    expect(pair).toHaveBeenCalledWith(
      { host, port: 7337, serverPublicKey: invite.key },
      invite.ticket,
      expect.anything(),
    );
  });

  it('keeps the other addresses the code carried beside the one that answered', async () => {
    const coded = {
      ...invite,
      urls: [urlOf(studio, 7337), urlOf(tailnet, 7337)],
    };

    await expect(
      pairWithInvite(coded, deps(spent(), heardAt())),
    ).resolves.toMatchObject({
      kind: 'paired',
      server: {
        address: { host: studio, port: 7337 },
        otherAddresses: [{ host: tailnet, port: 7337 }],
      },
    });
  });
});
