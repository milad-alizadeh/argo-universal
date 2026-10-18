import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const slotEventId = '0#accessories/button:onPress';

const listFixture = { id: 'list', fixture: 'keyed-list' };

it('carries every node in fragment and array slots', async () => {
  const home = await createRuntimePlugins([listFixture]);

  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const input = { pluginId: 'list', path: '/slots' };

  const stream = (
    await createCaller({ signal: controller.signal }).plugins.view(input)
  )[Symbol.asyncIterator]();

  const initial = (await stream.next()).value;
  expect(initial).toMatchObject({
    type: 'snapshot',
    root: {
      props: { label: 'Slotted row' },
      slots: {
        leading: [
          { props: { label: 'First' } },
          { props: { label: 'Second' } },
        ],
        accessories: [
          {
            props: {
              label: 'Increment',
              onPress: { $event: slotEventId },
            },
          },
          { props: { label: 'Count 0' } },
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
        key: [{ slot: 'accessories', key: 'count' }],
        props: { label: 'Count 1' },
      },
    ],
  },
  {
    path: '/slots-empty',
    ops: [
      { op: 'remove', key: [{ slot: 'leading', key: 'First' }] },
      { op: 'remove', key: [{ slot: 'leading', key: 'Second' }] },
      { op: 'remove', key: [{ slot: 'accessories', key: 'button' }] },
      { op: 'remove', key: [{ slot: 'accessories', key: 'count' }] },
    ],
  },
])(
  'patches $path without turning slots into props',
  async ({ path, ops }) => {
    const home = await createRuntimePlugins([listFixture]);
    const { caller, createCaller } = await startEngineTestHost({ home });
    const controller = new AbortController();
    onTestFinished(() => controller.abort());
    const input = { pluginId: 'list', path };

    const stream = (
      await createCaller({ signal: controller.signal }).plugins.view(input)
    )[Symbol.asyncIterator]();

    await stream.next();
    await caller.plugins.dispatch({ ...input, eventId: slotEventId });
    expect((await stream.next()).value).toEqual({
      type: 'patch',
      revision: 2,
      ops,
    });
  },
  10_000,
);
