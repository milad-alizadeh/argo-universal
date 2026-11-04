import type { ServerResponse } from 'node:http';
import type { PluginTest } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { fixtureNetwork, httpsServer } from '../../engine/mocks/probe-plugin';
import { dataFixture } from '../mocks/data-fixture';
import { drawnText, textPages } from './query-pages';

const fetchPlugin = async (
  port: number,
  source: string,
): Promise<PluginTest> => {
  const fixture = await dataFixture(source, {}, [
    { kind: 'fetch', host: `localhost:${port}`, reason: 'Fixture' },
  ]);

  return fixture.start({ network: await fixtureNetwork() });
};

const fetched = (url: string, rest = ''): string =>
  `async ({ read }) => { const answer = await read({ api: 'fetch', url: '${url}'${rest} }); return answer.status + ':' + answer.body; }`;

it('keeps an HTTP error as data, and the last answer through a transport error', async () => {
  let requests = 0;

  const port = await httpsServer((_request, response) => {
    requests += 1;

    if (requests === 1) response.writeHead(401).end('first');
    else response.destroy();
  });

  const url = `https://localhost:${port}/graphql`;

  const kit = await fetchPlugin(
    port,
    textPages({ '/': { load: fetched(url), every: 10000 } }),
  );

  expect(await drawnText(kit, { path: '/' })).toBe('401:first');
  await kit.clock.advance(10000);
  expect(await drawnText(kit, { path: '/' })).toBe('401:first');
  expect(requests).toBe(4);
  expect(await kit.log()).toContain('argo call failed: socket hang up');
});

it('joins two pages reading one fetch whose object keys and header names differ in order or case', async () => {
  const held: ServerResponse[] = [];

  const port = await httpsServer((_request, response) => {
    held.push(response);
  });

  const url = `https://localhost:${port}/`;

  const kit = await fetchPlugin(
    port,
    textPages({
      '/first': {
        load: fetched(url, ", headers: { 'X-First': 'a', 'x-second': 'b' }"),
      },
      '/second': {
        load: `async ({ read }) => (await read({ headers: { 'X-SECOND': 'b', 'x-first': 'a' }, url: '${url}', api: 'fetch' })).body`,
      },
    }),
  );

  const first = drawnText(kit, { path: '/first' });
  const second = drawnText(kit, { path: '/second' });

  await expect.poll(() => held.length).toBe(1);
  held[0]?.end('answer');
  expect(await first).toBe('200:answer');
  expect(await second).toBe('answer');
  expect(held).toHaveLength(1);
});

it('fails a draw whose fetch stalls past the shared Argo timeout', async () => {
  const requested = Promise.withResolvers<void>();

  const port = await httpsServer(() => {
    requested.resolve();
  });

  const kit = await fetchPlugin(
    port,
    textPages({ '/': { load: fetched(`https://localhost:${port}/stalled`) } }),
  );

  let settled = false;

  const drawn = kit.pages.draw({ path: '/' }).finally(() => {
    settled = true;
  });

  await requested.promise;
  await kit.clock.advance(29999);
  expect(settled).toBe(false);

  await kit.clock.advance(1);
  // The fetch and the draw share Argo's one timeout, so either may be the reason the draw gives.
  expect(await drawn).toMatchObject({ kind: 'failed' });
});

it('refuses a Query that borrows an Account, which no Plugin provides yet', async () => {
  let requested = false;

  const port = await httpsServer((_request, response) => {
    requested = true;
    response.end('answer');
  });

  const kit = await fetchPlugin(
    port,
    textPages({
      '/': {
        load: fetched(
          `https://localhost:${port}/`,
          `, account: 'localhost:${port}'`,
        ),
      },
    }),
  );

  expect(await kit.pages.draw({ path: '/' })).toMatchObject({
    kind: 'failed',
    error: expect.stringContaining('Account is unavailable'),
  });
  expect(requested).toBe(false);
});
