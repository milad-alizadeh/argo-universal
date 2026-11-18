import { PairingRefusal } from '@repo/contracts';
import { describe, expect, it, vi } from 'vitest';
import { type PairDeps, pairWithInvite } from './pair-with-invite';

const invite = { key: 'studio-key', server: 'Studio', ticket: '123456' };

const first = 'first.local';

const second = 'second.local';

const studio = 'studio.local';

type Pair = PairDeps['pair'];

type Resolve = PairDeps['resolve'];

// Where the Server says it is now, as discovery would answer.
const heardAt = (...hosts: string[]): Resolve =>
  vi.fn<Resolve>().mockResolvedValue({
    name: invite.server,
    hosts,
    port: 4000,
    source: 'discovery',
  });

const deps = (
  pair: Pair,
  resolve: Resolve,
  rest?: Partial<PairDeps>,
): PairDeps => ({
  browse: null,
  pair,
  resolve,
  ...rest,
});

const refused = (refusal: string): Error =>
  Object.assign(new Error('refused'), { refusal });

describe('pairing with the Server a code names', () => {
  it('has nothing to knock on when the Server is not heard and no address is known', async () => {
    const pair = vi.fn<Pair>();
    const resolve = vi.fn<Resolve>().mockRejectedValue(new Error('not found'));

    await expect(pairWithInvite(invite, deps(pair, resolve))).resolves.toEqual({
      kind: 'not-found',
    });
    expect(pair).not.toHaveBeenCalled();
  });

  it('keeps the name the Server answers to now, and the address that answered', async () => {
    const pair = vi.fn<Pair>().mockResolvedValue({ deviceId: 'phone' });
    const resolve = heardAt(studio);

    await expect(pairWithInvite(invite, deps(pair, resolve))).resolves.toEqual({
      kind: 'paired',
      server: {
        name: invite.server,
        key: invite.key,
        address: { host: studio, port: 4000 },
      },
    });
    expect(pair).toHaveBeenCalledWith(
      { host: studio, port: 4000, serverPublicKey: invite.key },
      invite.ticket,
      expect.anything(),
    );
  });

  it('tries the next address when one does not answer, and keeps the one that did', async () => {
    const pair = vi
      .fn<Pair>()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValueOnce({ deviceId: 'phone' });

    const outcome = await pairWithInvite(
      invite,
      deps(pair, heardAt(first, second)),
    );

    expect(outcome).toMatchObject({
      kind: 'paired',
      server: { address: { host: second } },
    });
  });

  it.each([
    ['ticket-expired', 'expired'],
    ['ticket-spent', 'expired'],
    ['ticket-unknown', 'expired'],
    ['declined', 'declined'],
    ['unanswered', 'unanswered'],
    ['replayed', 'failed'],
  ] as const)('reads the Server saying %s as %s', async (refusal, kind) => {
    expect(PairingRefusal.safeParse(refusal).success).toBe(true);

    const pair = vi.fn<Pair>().mockRejectedValue(refused(refusal));

    await expect(
      pairWithInvite(invite, deps(pair, heardAt(first, second))),
    ).resolves.toEqual({ kind });
    // A Server that answered and said no is not a Server at a wrong address.
    expect(pair).toHaveBeenCalledOnce();
  });

  it('says not found when no address answers', async () => {
    const pair = vi.fn<Pair>().mockRejectedValue(new Error('timed out'));

    await expect(
      pairWithInvite(invite, deps(pair, heardAt(first, second))),
    ).resolves.toEqual({ kind: 'not-found' });
    expect(pair).toHaveBeenCalledTimes(2);
  });

  it('says undetermined, not not-found, when the first look at the network hears nothing', async () => {
    const pair = vi.fn<Pair>();
    const undetermined = Object.assign(new Error('nothing heard yet'), {
      name: 'BrowseUndeterminedError',
    });
    const resolve = vi.fn<Resolve>().mockRejectedValue(undetermined);

    await expect(pairWithInvite(invite, deps(pair, resolve))).resolves.toEqual({
      kind: 'undetermined',
    });
  });

  it('knocks first where the code says the Server answers, without asking the network', async () => {
    const pair = vi.fn<Pair>().mockResolvedValue({ deviceId: 'phone' });
    const resolve = heardAt(first);
    const coded = { ...invite, urls: [`http://${studio}:7337`] };

    await expect(pairWithInvite(coded, deps(pair, resolve))).resolves.toEqual({
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

    const coded = { ...invite, urls: [`http://${first}:4000`] };

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
    const pair = vi.fn<Pair>().mockResolvedValue({ deviceId: 'phone' });
    const coded = { ...invite, urls: ['not a url', 'http://[fd00::7]:7337'] };

    await pairWithInvite(coded, deps(pair, heardAt()));

    expect(pair).toHaveBeenCalledWith(
      { host: 'fd00::7', port: 7337, serverPublicKey: invite.key },
      invite.ticket,
      expect.anything(),
    );
  });

  it('passes on when the Server is reached, so the owner is said to be asked only then', async () => {
    const onReached = vi.fn();
    const pair = vi.fn<Pair>().mockResolvedValue({ deviceId: 'phone' });

    await pairWithInvite(invite, deps(pair, heardAt(studio), { onReached }));

    expect(pair).toHaveBeenCalledWith(
      expect.anything(),
      invite.ticket,
      expect.objectContaining({ onReached }),
    );
  });
});
