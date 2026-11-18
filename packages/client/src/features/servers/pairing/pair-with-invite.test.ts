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

  it('waits four seconds on the first look at the network, and three on a later one', async () => {
    const resolve = vi.fn<Resolve>().mockRejectedValue(new Error('none'));
    const pair = vi.fn<Pair>();

    await pairWithInvite(invite, deps(pair, resolve, { firstBrowse: true }));
    await pairWithInvite(invite, deps(pair, resolve));

    expect(resolve.mock.calls.map((call) => call[2])).toEqual([
      4000,
      undefined,
    ]);
  });

  it('says undetermined, not not-found, when the first look at the network hears nothing', async () => {
    const resolve = vi.fn<Resolve>().mockRejectedValue(new Error('none'));
    const first = deps(vi.fn<Pair>(), resolve, { firstBrowse: true });

    await expect(pairWithInvite(invite, first)).resolves.toEqual({
      kind: 'undetermined',
    });
  });

  it('says denied when the system refused the look, even on the first one', async () => {
    const resolve = vi.fn<Resolve>().mockImplementation((...args) => {
      args[3]?.();

      return Promise.reject(new Error('none'));
    });
    const first = deps(vi.fn<Pair>(), resolve, { firstBrowse: true });

    await expect(pairWithInvite(invite, first)).resolves.toEqual({
      kind: 'denied',
    });
  });

  it('says misconfigured when the build never declared that it browses', async () => {
    const resolve = vi.fn<Resolve>().mockRejectedValue(new Error('none'));
    const build = deps(vi.fn<Pair>(), resolve, { declared: false });

    await expect(pairWithInvite(invite, build)).resolves.toEqual({
      kind: 'misconfigured',
    });
  });

  it('says the address did not go on to ask the owner when it fails after the socket opened', async () => {
    const onUnreached = vi.fn<() => void>();
    const pair = vi.fn<Pair>().mockRejectedValue(new Error('closed'));

    await pairWithInvite(invite, deps(pair, heardAt(studio), { onUnreached }));

    expect(onUnreached).toHaveBeenCalledOnce();
  });

  it('passes on when the Server is reached, so the owner is said to be asked only then', async () => {
    const onReached = vi.fn<() => void>();
    const pair = vi.fn<Pair>().mockResolvedValue({ deviceId: 'phone' });

    await pairWithInvite(invite, deps(pair, heardAt(studio), { onReached }));

    expect(pair).toHaveBeenCalledWith(
      expect.anything(),
      invite.ticket,
      expect.objectContaining({ onReached }),
    );
  });
});
