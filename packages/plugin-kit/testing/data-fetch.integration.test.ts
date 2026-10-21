import type { ServerResponse } from 'node:http';
import { expect, it } from 'vitest';
import { fixtureNetwork, httpsServer } from '../../engine/mocks/probe-plugin';
import { dataFixture } from '../mocks/data-fixture';

it('keeps HTTP errors as data, joins refreshes and preserves data through a transport error', async () => {
  const requests: ServerResponse[] = [];

  const port = await httpsServer((_request, response) => {
    requests.push(response);

    answerRequest(requests.length, response);
  });

  const fixture = await dataFixture(
    `import { Text, Button, Stack, useData } from '@argo/plugin-kit';
    export function register(argo) {
      function Data() {
        const { data, error, stale, refresh } = useData({ api: 'fetch', url: 'https://localhost:${port}/graphql', method: 'POST', body: '{}' });
        return <Stack direction="column"><Text>{data ? data.status + ':' + data.body : 'empty'}</Text><Text>{error ? 'error' : 'no error'}</Text><Text>{stale ? 'stale' : 'settled'}</Text><Button label="Refresh" onPress={() => Promise.all([refresh(), refresh()])} /></Stack>;
      }
      argo.pages.register('/', Data);
    }`,
    {},
    [{ kind: 'fetch', host: `localhost:${port}`, reason: 'Fixture' }],
  );

  const kit = await fixture.start({ network: await fixtureNetwork() });
  const page = kit.page();
  await page.find('401:first');
  expect(page.findText('no error')).toBeDefined();
  const refreshed = page.press('Refresh');
  await expect.poll(() => requests.length).toBe(2);
  await page.find('stale');
  expect(page.findText('401:first')).toBeDefined();
  requests[1]?.end('second');
  await refreshed;
  await page.find('200:second');
  await page.press('Refresh');
  await page.find('error');
  expect(page.findText('200:second')).toBeDefined();
  expect(page.findText('settled')).toBeDefined();
  await page.press('Refresh');
  await page.find('200:last');
  expect(page.findText('no error')).toBeDefined();
  expect(requests).toHaveLength(4);
});

function answerRequest(number: number, response: ServerResponse): void {
  const answers = new Map<number, () => void>([
    [
      1,
      (): void => {
        response.writeHead(401).end('first');
      },
    ],
    [
      3,
      (): void => {
        response.destroy();
      },
    ],
    [
      4,
      (): void => {
        response.end('last');
      },
    ],
  ]);

  answers.get(number)?.();
}

it('settles a stalled Query at the shared Argo timeout and stops stale state', async () => {
  const requested = Promise.withResolvers<void>();

  const port = await httpsServer(() => {
    requested.resolve();
  });

  const fixture = await dataFixture(
    `import { Text, useData } from '@argo/plugin-kit';
    export function register(argo) {
      argo.pages.register('/', () => {
        const { data, error, stale } = useData({ api: 'fetch', url: 'https://localhost:${port}/stalled' });
        return <Text>{error ? 'error' : stale ? 'stale' : data ? 'data' : 'empty'}</Text>;
      });
    }`,
    {},
    [{ kind: 'fetch', host: `localhost:${port}`, reason: 'Fixture' }],
  );

  const kit = await fixture.start({ network: await fixtureNetwork() });
  const page = kit.page();
  await requested.promise;
  await kit.clock.advance(29999);
  expect(page.findText('error')).toBeUndefined();
  expect(page.findText('stale')).toBeUndefined();
  await kit.clock.advance(1);
  await page.find('error');
});

it('shares inline Queries whose object keys and header names differ in order or case', async () => {
  let requests = 0;

  const port = await httpsServer((_request, response) => {
    requests += 1;
    response.end('answer');
  });

  const fixture = await dataFixture(
    `import { Text, useData } from '@argo/plugin-kit';
    export function register(argo) {
      function First() {
        const { data } = useData({ api: 'fetch', url: 'https://localhost:${port}/', headers: { 'X-First': 'a', 'x-second': 'b' } });
        return <Text>{data?.body ?? 'empty'}</Text>;
      }
      function Second() {
        const { data } = useData({ headers: { 'X-SECOND': 'b', 'x-first': 'a' }, url: 'https://localhost:${port}/', api: 'fetch' });
        return <Text>{data?.body ?? 'empty'}</Text>;
      }
      argo.pages.register('/first', First);
      argo.pages.register('/second', Second);
    }`,
    {},
    [{ kind: 'fetch', host: `localhost:${port}`, reason: 'Fixture' }],
  );

  const kit = await fixture.start({ network: await fixtureNetwork() });
  const first = kit.page('/first');
  await first.find('answer');
  const second = kit.page('/second');
  await second.find('answer');
  expect(requests).toBe(1);
  expect(JSON.stringify(second.trees[0])).toContain('"children":"answer"');
});

it('refuses a Query that borrows an Account, which no Plugin provides yet', async () => {
  let requested = false;

  const port = await httpsServer((_request, response) => {
    requested = true;
    response.end('answer');
  });

  const fixture = await dataFixture(
    `import { Text, useData } from '@argo/plugin-kit';
    export function register(argo) {
      argo.pages.register('/', () => {
        const { data, error } = useData({ api: 'fetch', url: 'https://localhost:${port}/', account: 'localhost:${port}' });
        return <Text>{error ?? (data ? 'answer' : 'empty')}</Text>;
      });
    }`,
    {},
    [{ kind: 'fetch', host: `localhost:${port}`, reason: 'Fixture' }],
  );

  const kit = await fixture.start({ network: await fixtureNetwork() });
  const page = kit.page();
  await page.find(`Refused: Account localhost:${port} is unavailable`);
  expect(requested).toBe(false);
});
