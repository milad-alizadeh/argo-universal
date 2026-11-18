import { toDiscoveredServer } from '@repo/contracts';
import { expect, it } from 'vitest';
import { Identity } from './service-identity';

const address = ['192', '0', '2', '7'].join('.');

const identityOf = (key: string): Identity =>
  new Identity({ name: 'Studio Mac', key, port: 4000 }, address);

it('answers for a different instance per Server key, so two Servers on one computer do not share one', () => {
  expect(identityOf('key-1').instance).not.toBe(identityOf('key-2').instance);
  expect(identityOf('key-1').instance).toBe(identityOf('key-1').instance);
});

it('is still listed by the computer name', () => {
  const txt = identityOf('key-1')
    .records(120)
    .find((record) => record.type === 'TXT');

  const buffers = (txt && 'data' in txt ? txt.data : []) as Buffer[];

  const fields = Object.fromEntries(
    buffers.map((line) => String(line).split(/=(.*)/s).slice(0, 2)),
  );

  const server = toDiscoveredServer({
    name: identityOf('key-1').instance.split('._')[0] ?? '',
    txt: fields,
    addresses: [],
    port: 4000,
  });

  expect(server?.name).toBe('Studio Mac');
});
