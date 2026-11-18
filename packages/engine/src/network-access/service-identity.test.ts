import { toDiscoveredServer } from '@repo/contracts';
import { expect, it } from 'vitest';
import { Identity } from './service-identity';

const address = ['192', '0', '2', '7'].join('.');

const identityOf = (key: string): Identity =>
  new Identity({ name: 'Studio Mac', key, port: 4000 }, address);

const textOf = (identity: Identity): string[] =>
  identity
    .records(120)
    .filter((record) => record.type === 'TXT')
    .flatMap((record) => ('data' in record ? [record.data] : []))
    .flat()
    .map(String);

const fieldsOf = (lines: readonly string[]): Record<string, string> =>
  Object.fromEntries(lines.map((line) => line.split(/=(.*)/s).slice(0, 2)));

it('answers for a different instance per Server key, so two Servers on one computer do not share one', () => {
  expect(identityOf('key-1').instance).not.toBe(identityOf('key-2').instance);
  expect(identityOf('key-1').instance).toBe(identityOf('key-1').instance);
});

it('is still listed by the computer name', () => {
  const identity = identityOf('key-1');

  const server = toDiscoveredServer({
    name: identity.instance.split('._')[0] ?? '',
    txt: fieldsOf(textOf(identity)),
    addresses: [],
    port: 4000,
  });

  expect(server?.name).toBe('Studio Mac');
});
