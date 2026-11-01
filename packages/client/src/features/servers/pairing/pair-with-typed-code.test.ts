import { keyHashOf, type DiscoveredServer } from '@repo/contracts';
import { describe, expect, it, vi } from 'vitest';
import type { PairDeps } from './pair-with-invite';
import { pairWithTypedCode, type TypedDeps } from './pair-with-typed-code';

const code = '482-915';

const ticket = '482915';

const studioKey = 'studio-key';

const studio: DiscoveredServer = {
  name: 'Studio',
  keyHash: keyHashOf(studioKey),
  addresses: ['studio.local'],
  port: 4000,
};

const office: DiscoveredServer = {
  name: 'Office',
  keyHash: keyHashOf('office-key'),
  addresses: ['office.local'],
  port: 4001,
};

type Ask = TypedDeps['requestKey'];

type Pair = PairDeps['pair'];

const refused = (refusal: string): Error =>
  Object.assign(new Error('refused'), { refusal });

// The Servers the network announces, all at once.
const announcing =
  (...servers: DiscoveredServer[]): NonNullable<PairDeps['browse']> =>
  (listener) => {
    listener(servers);

    return () => {};
  };

function depsFor(rest: Partial<TypedDeps> & { requestKey: Ask }): TypedDeps {
  return {
    browse: announcing(studio),
    pair: vi.fn<Pair>().mockResolvedValue({ deviceId: 'mac' }),
    resolve: vi.fn<PairDeps['resolve']>().mockResolvedValue({
      name: studio.name,
      hosts: studio.addresses,
      port: studio.port,
      source: 'discovery',
    }),
    settleMs: 0,
    ...rest,
  };
}

describe('pairing with a code that was typed', () => {
  it('asks the Server announced on the network for its key, and pairs with the key it is given', async () => {
    const requestKey = vi.fn<Ask>().mockResolvedValue(studioKey);
    const pair = vi.fn<Pair>().mockResolvedValue({ deviceId: 'mac' });
    const onFound = vi.fn<(name: string) => void>();

    const outcome = await pairWithTypedCode(
      code,
      depsFor({ requestKey, pair, onFound }),
    );

    expect(onFound).toHaveBeenCalledWith('Studio');

    expect(requestKey).toHaveBeenCalledWith(
      { host: 'studio.local', port: 4000 },
      ticket,
    );
    expect(pair).toHaveBeenCalledWith(
      expect.objectContaining({ serverPublicKey: studioKey }),
      ticket,
      expect.anything(),
    );
    expect(outcome).toMatchObject({
      kind: 'paired',
      server: { name: 'Studio', key: studioKey },
    });
  });

  it('finds the Server the code belongs to among those it does not', async () => {
    const requestKey = vi
      .fn<Ask>()
      .mockRejectedValueOnce(refused('ticket-unknown'))
      .mockResolvedValueOnce(studioKey);

    const outcome = await pairWithTypedCode(
      code,
      depsFor({ requestKey, browse: announcing(office, studio) }),
    );

    expect(requestKey).toHaveBeenCalledTimes(2);
    expect(outcome).toMatchObject({ kind: 'paired' });
  });

  it('says the code is mistyped when every Server it asked says it does not know it', async () => {
    const requestKey = vi
      .fn<Ask>()
      .mockRejectedValue(refused('ticket-unknown'));

    await expect(
      pairWithTypedCode(code, depsFor({ requestKey })),
    ).resolves.toEqual({ kind: 'mistyped' });
  });

  it('says so without asking anyone when the code cannot be a code', async () => {
    const requestKey = vi.fn<Ask>();

    await expect(
      pairWithTypedCode('4829', depsFor({ requestKey })),
    ).resolves.toEqual({ kind: 'mistyped' });
    expect(requestKey).not.toHaveBeenCalled();
  });

  it.each([
    ['ticket-expired', 'expired'],
    ['ticket-spent', 'expired'],
    ['ticket-attempts', 'turned-away'],
  ] as const)('reads the Server saying %s as %s', async (refusal, kind) => {
    const requestKey = vi.fn<Ask>().mockRejectedValue(refused(refusal));

    await expect(
      pairWithTypedCode(code, depsFor({ requestKey })),
    ).resolves.toEqual({ kind });
  });

  it('says not found when nothing announces itself or nothing answers', async () => {
    const requestKey = vi.fn<Ask>().mockRejectedValue(new Error('timed out'));

    await expect(
      pairWithTypedCode(code, depsFor({ requestKey })),
    ).resolves.toEqual({ kind: 'not-found' });
    await expect(
      pairWithTypedCode(
        code,
        depsFor({ requestKey, browse: announcing(), timeoutMs: 10 }),
      ),
    ).resolves.toEqual({ kind: 'not-found' });
    await expect(
      pairWithTypedCode(code, depsFor({ requestKey, browse: null })),
    ).resolves.toEqual({ kind: 'not-found' });
  });

  it('ends in the owner declining like a scanned code does', async () => {
    const requestKey = vi.fn<Ask>().mockResolvedValue(studioKey);
    const pair = vi.fn<Pair>().mockRejectedValue(refused('declined'));

    await expect(
      pairWithTypedCode(code, depsFor({ requestKey, pair })),
    ).resolves.toEqual({ kind: 'declined' });
  });
});
