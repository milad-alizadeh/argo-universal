import { describe, expect, it, vi } from 'vitest';
import type { PairDeps } from './pair-with-invite';
import { pairWithTypedCode, type TypedDeps } from './pair-with-typed-code';
import { readTypedAddress } from './typed-address';

const code = '482-915';

const ticket = '482915';

const key = 'studio-key';

const host = 'desk.local';

const typed = `${host}:4000`;

const at = { host, port: 4000 };

type Ask = TypedDeps['requestKey'];

type Pair = PairDeps['pair'];

const refused = (refusal: string): Error =>
  Object.assign(new Error('refused'), { refusal });

// Nothing is announced, and the stored address is the only place to knock, as resolving a Server with no announcement does.
const resolve = vi
  .fn<PairDeps['resolve']>()
  .mockImplementation(({ name }) =>
    Promise.resolve({ name, hosts: [host], port: at.port, source: 'address' }),
  );

const browse = vi.fn<NonNullable<PairDeps['browse']>>();

function depsFor(rest: Partial<TypedDeps> & { requestKey: Ask }): TypedDeps {
  return {
    browse,
    pair: vi.fn<Pair>().mockResolvedValue({ deviceId: 'phone' }),
    resolve,
    host: typed,
    ...rest,
  };
}

describe('pairing at an address the owner typed', () => {
  it('asks that address for its key and pairs there without listening for announcements', async () => {
    const requestKey = vi.fn<Ask>().mockResolvedValue(key);
    const pair = vi.fn<Pair>().mockResolvedValue({ deviceId: 'phone' });

    const outcome = await pairWithTypedCode(
      code,
      depsFor({ requestKey, pair }),
    );

    expect(requestKey).toHaveBeenCalledExactlyOnceWith(at, ticket);
    expect(browse).not.toHaveBeenCalled();
    expect(resolve.mock.calls.at(-1)?.[1]).toBeNull();
    expect(pair).toHaveBeenCalledWith(
      { ...at, serverPublicKey: key },
      ticket,
      expect.anything(),
    );
    expect(outcome).toMatchObject({
      kind: 'paired',
      server: { key, address: at },
    });
  });

  it('names the address as the one being waited on', async () => {
    const onFound = vi.fn<(name: string) => void>();

    await pairWithTypedCode(
      code,
      depsFor({ requestKey: vi.fn<Ask>().mockResolvedValue(key), onFound }),
    );

    expect(onFound).toHaveBeenCalledWith(typed);
  });

  it('says not found when nothing answers at the address', async () => {
    const requestKey = vi.fn<Ask>().mockRejectedValue(new Error('timed out'));

    await expect(
      pairWithTypedCode(code, depsFor({ requestKey })),
    ).resolves.toEqual({ kind: 'not-found' });
  });

  it.each([
    ['ticket-unknown', 'mistyped'],
    ['ticket-expired', 'expired'],
    ['ticket-attempts', 'turned-away'],
  ] as const)(
    'reads the Server there saying %s as %s',
    async (refusal, kind) => {
      const requestKey = vi.fn<Ask>().mockRejectedValue(refused(refusal));

      await expect(
        pairWithTypedCode(code, depsFor({ requestKey })),
      ).resolves.toEqual({ kind });
    },
  );

  it('leaves a bare name to discovery, which asks the Servers it hears', async () => {
    const requestKey = vi.fn<Ask>();

    await pairWithTypedCode(code, depsFor({ requestKey, host, browse: null }));

    expect(requestKey).not.toHaveBeenCalled();
  });
});

describe('reading a typed address', () => {
  it.each([
    [typed, at],
    [` ${typed} `, at],
    ['desk.local:80', { host, port: 80 }],
  ])('reads %s as a host and a port', (text, address) => {
    expect(readTypedAddress(text)).toEqual(address);
  });

  it.each([
    undefined,
    '',
    host,
    `${host}:`,
    ':4000',
    `${host}:0`,
    `${host}:65536`,
    `${host}:40a0`,
    `a:b:4000`,
    'desk local:4000',
  ])('reads %s as no address', (text) => {
    expect(readTypedAddress(text)).toBeUndefined();
  });
});
