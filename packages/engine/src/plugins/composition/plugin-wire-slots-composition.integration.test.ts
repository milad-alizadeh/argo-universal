import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { liveAnswers, pageAt } from '#mocks/plugin-pages';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const listFixture = { id: 'list', fixture: 'keyed-list' };

async function liveSlots(
  path: string,
): Promise<Awaited<ReturnType<typeof liveAnswers>>> {
  const home = await createRuntimePlugins([listFixture]);
  const host = await startEngineTestHost({ home });

  return liveAnswers(host, pageAt('list', path), 2);
}

it('carries every node in fragment and array slots', async () => {
  const [first] = await liveSlots('/slots');

  expect(first).toMatchObject({
    kind: 'tree',
    root: {
      props: { title: 'Slotted row' },
      slots: {
        leading: [
          { props: { children: 'First' } },
          { props: { children: 'Second' } },
        ],
        trailing: [
          { props: { label: 'Increment' } },
          { props: { children: 'Count 0' } },
        ],
      },
    },
  });
}, 10_000);

it.each([
  {
    path: '/slots',
    ops: [
      {
        op: 'setProps',
        key: [{ slot: 'trailing', key: 'count' }],
        props: { children: 'Count 1' },
      },
    ],
  },
  {
    path: '/slots-empty',
    ops: [
      { op: 'remove', key: [{ slot: 'leading', key: 'First' }] },
      { op: 'remove', key: [{ slot: 'leading', key: 'Second' }] },
      { op: 'remove', key: [{ slot: 'trailing', key: 'button' }] },
      { op: 'remove', key: [{ slot: 'trailing', key: 'count' }] },
    ],
  },
])(
  'patches $path without turning slots into props',
  async ({ path, ops }) => {
    const [, patch] = await liveSlots(path);

    expect(patch).toMatchObject({ kind: 'patch', ops });
  },
  10_000,
);
