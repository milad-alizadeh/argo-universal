import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { dataFixture, processWait } from '../mocks/data-fixture';
import { drawnText, processRead, textPages } from './query-pages';

const count = `async ({ read }) => (await read(${processRead})).stdout`;

it('drops the kept answers when a Plugin reloads on an advanced clock', async () => {
  const source = textPages({ '/': { load: count, every: 10000 } });
  const fixture = await dataFixture(source);

  const kit = await fixture.start();

  expect(await drawnText(kit, { path: '/' })).toBe('1');
  await kit.clock.advance(1000);
  await writeFile(
    join(fixture.directory, 'index.tsx'),
    source.replace("['query-fixture']", "['query-fixture', 'new']"),
  );
  await expect
    .poll(() => drawnText(kit, { path: '/' }).catch(() => null), processWait)
    .toBe('2');
  await kit.clock.advance(9000);
  expect(await drawnText(kit, { path: '/' })).toBe('2');
  await kit.clock.advance(1000);
  expect(await drawnText(kit, { path: '/' })).toBe('3');
  expect(
    (await fixture.requests()).map((line) => JSON.parse(line).args),
  ).toEqual([[], ['new'], ['new']]);
});

it('reports a worker that crashes in an Operation as stopped', async () => {
  const fixture = await dataFixture(
    `export function register(argo) {
      argo.operations.register('crash', () => { void Promise.reject(new Error('worker failed')); return null; });
    }`,
    {
      operations: [
        {
          name: 'crash',
          label: 'Crash',
          description: 'Crashes the worker.',
          tier: 'act',
          params: {},
        },
      ],
    },
  );

  const kit = await fixture.start();
  const controller = new AbortController();
  const failures = kit.failures(controller.signal);
  expect((await failures.next()).value).toEqual([]);
  const ran = kit.pages.run({ operation: 'crash', args: {} }).catch(() => {});
  expect((await failures.next()).value).toEqual([
    expect.objectContaining({ kind: 'stopped', message: 'worker failed' }),
  ]);
  await ran;
  controller.abort();
  await failures.return([]);
});

it('switches Query kinds with the Page state without reading one answer as the other kind', async () => {
  const fixture = await dataFixture(`import { Text } from '@argo/plugin-kit';
  export function register(argo) {
    argo.pages.define('/', {
      state: { storage: false },
      load: async ({ read, state }) => {
        if (!state.storage) return (await read(${processRead})).stdout;
        const [answer] = await read({ api: 'storage', queries: [{ sql: "SELECT 'row'", params: [], method: 'values' }] });
        return answer.rows[0][0];
      },
      render: (text) => <Text>{text}</Text>,
    });
  }`);

  const kit = await fixture.start();

  expect(await drawnText(kit, { path: '/' })).toBe('1');
  expect(
    await drawnText(kit, { path: '/', pageState: { storage: true } }),
  ).toBe('row');
  expect(
    await drawnText(kit, { path: '/', pageState: { storage: false } }),
  ).toBe('1');
  expect(await fixture.requests()).toHaveLength(1);
});
