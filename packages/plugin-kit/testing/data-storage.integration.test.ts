import { expect, it } from 'vitest';
import { dataFixture } from '../mocks/data-fixture';
import { drawnText } from './query-pages';

const write = {
  name: 'write',
  label: 'Write a row',
  description: 'Adds the second row.',
  tier: 'act' as const,
  params: {},
};

const firstRow = '[{"rows":[["first"]]}]';

const storagePlugin = (
  query: string,
): string => `import { Text } from '@argo/plugin-kit';
export async function register(argo) {
  await argo.storage.batch([{ sql: 'CREATE TABLE items(value TEXT)', params: [], method: 'run' }, { sql: "INSERT INTO items VALUES ('first')", params: [], method: 'run' }]);
  argo.operations.register('write', () => argo.storage.execute({ sql: "INSERT INTO items VALUES ('second')", params: [], method: 'run' }));
  argo.pages.define('/', {
    load: ({ read }) => read({ api: 'storage', queries: [${query}] }),
    render: (rows) => <Text>{JSON.stringify(rows)}</Text>,
  });
  argo.pages.define('/rows', {
    load: ({ read }) => read({ api: 'storage', queries: [{ sql: 'SELECT value FROM items', params: [], method: 'values' }] }),
    render: (rows) => <Text>{JSON.stringify(rows)}</Text>,
  });
}`;

it('reads a storage Query again after a write, and not on a clock', async () => {
  const fixture = await dataFixture(
    storagePlugin(
      "{ sql: 'SELECT value FROM items ORDER BY value', params: [], method: 'values' }",
    ),
    { operations: [write] },
  );

  const kit = await fixture.start();

  expect(await drawnText(kit, { path: '/' })).toBe(firstRow);
  const before = (await kit.log()).split('argo.storage').length;
  await kit.clock.advance(60_000);
  expect(await drawnText(kit, { path: '/' })).toBe(firstRow);
  expect((await kit.log()).split('argo.storage')).toHaveLength(before);

  await kit.pages.run({ operation: 'write', args: {} });
  expect(await drawnText(kit, { path: '/' })).toBe(
    '[{"rows":[["first"],["second"]]}]',
  );
});

it.each(['all', 'run'])(
  'cannot write through a storage Query using %s',
  async (method) => {
    const fixture = await dataFixture(
      storagePlugin(
        `{ sql: "INSERT INTO items VALUES ('wrong') RETURNING value", params: [], method: '${method}' }`,
      ),
    );

    const kit = await fixture.start();

    expect(await kit.pages.draw({ path: '/' })).toMatchObject({
      kind: 'failed',
    });
    expect(await drawnText(kit, { path: '/rows' })).toBe(firstRow);
  },
);
