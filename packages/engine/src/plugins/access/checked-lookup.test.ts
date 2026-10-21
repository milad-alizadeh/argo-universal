import type { LookupAddress, LookupOptions } from 'node:dns';
import { describe, expect, it } from 'vitest';
import fixtures from './address-fixtures.json' with { type: 'json' };
import { CapabilityRefusal } from './capability-refusal';
import { checkedLookup } from './plugin-addresses';

type Lookup = Parameters<typeof checkedLookup>[1];

type Callback = Parameters<Lookup>[2];

type Answer = Parameters<Callback>;

const first: LookupAddress = { address: fixtures.publicIpv6First, family: 6 };

const second: LookupAddress = {
  address: fixtures.publicIpv6Second,
  family: 6,
};

const closed = { private: false };

const open = { private: true };

const resolving =
  (found: LookupAddress[]): Lookup =>
  (_host, _options, callback): void =>
    callback(null, found);

const resolvingText =
  (address: string, family: number): Lookup =>
  (_host, _options, callback): void =>
    callback(null, address, family);

const ask = (
  rule: { private: boolean },
  lookup: Lookup,
  options: LookupOptions = {},
): Promise<Answer> =>
  new Promise((resolve) =>
    checkedLookup(rule, lookup)('example.com', options, (...answer) =>
      resolve(answer),
    ),
  );

describe('checkedLookup refuses a private answer for a closed rule', () => {
  it.each(fixtures.private)('$name', async ({ address, family }) => {
    const [error, shown, shownFamily] = await ask(
      closed,
      resolving([{ address, family }]),
    );

    expect(error).toBeInstanceOf(CapabilityRefusal);
    expect(error?.message).toBe(
      `example.com resolves to private address ${address}`,
    );
    expect([shown, shownFamily]).toEqual(['', 0]);
  });

  it('refuses when only one of several addresses is private', async () => {
    const mixed = [first, { address: fixtures.privateIpv4, family: 4 }, second];

    const [error] = await ask(closed, resolving(mixed));

    expect(error?.message).toBe(
      `example.com resolves to private address ${fixtures.privateIpv4}`,
    );
  });

  it('refuses a private address the lookup returned as plain text', async () => {
    const [error] = await ask(closed, resolvingText(fixtures.privateIpv4, 4));

    expect(error).toBeInstanceOf(CapabilityRefusal);
  });
});

describe('checkedLookup answers as the caller asked', () => {
  it('gives every address when the caller asked for all', async () => {
    expect(
      await ask(closed, resolving([first, second]), { all: true }),
    ).toEqual([null, [first, second]]);
  });

  it('gives the first address and its family when the caller did not ask for all', async () => {
    expect(await ask(closed, resolving([first, second]))).toEqual([
      null,
      first.address,
      6,
    ]);
  });

  it('accepts an address the lookup returned as plain text', async () => {
    expect(await ask(closed, resolvingText(first.address, 6))).toEqual([
      null,
      first.address,
      6,
    ]);
  });

  it('reports no address found when nothing resolved for a single-address caller', async () => {
    const [error, address, family] = await ask(closed, resolving([]));

    expect([error?.message, address, family]).toEqual([
      'No address found',
      '',
      0,
    ]);
  });

  it('gives an empty list when nothing resolved for an all-addresses caller', async () => {
    expect(await ask(closed, resolving([]), { all: true })).toEqual([null, []]);
  });

  it('allows a public IPv4 answer for a closed rule', async () => {
    const [error] = await ask(
      closed,
      resolving([{ address: fixtures.publicIpv4, family: 4 }]),
    );

    expect(error).toBeNull();
  });
});

describe('checkedLookup with a declared private host', () => {
  it('lets a private address through', async () => {
    const [error, address] = await ask(
      open,
      resolvingText(fixtures.privateIpv4, 4),
    );

    expect([error, address]).toEqual([null, fixtures.privateIpv4]);
  });
});

describe('checkedLookup toward the real lookup', () => {
  it('always asks for every address, so a mixed answer cannot hide a private one', async () => {
    const asked: LookupOptions[] = [];

    const lookup: Lookup = (_host, options, callback): void => {
      asked.push(options);

      callback(null, [first]);
    };

    await ask(closed, lookup, { all: false, family: 6 });

    expect(asked).toEqual([{ all: true, family: 6 }]);
  });

  it('passes the real lookup error on with an empty address and family 0', async () => {
    const failure = new Error('lookup failed');

    const lookup: Lookup = (_host, _options, callback): void =>
      callback(failure, '', 0);

    expect(await ask(closed, lookup)).toEqual([failure, '', 0]);
  });
});
