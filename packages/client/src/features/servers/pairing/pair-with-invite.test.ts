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
});
