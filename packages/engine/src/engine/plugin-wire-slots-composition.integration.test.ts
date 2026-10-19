import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { pluginTap } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const slotKey = '0#trailing/button';

const listFixture = { id: 'list', fixture: 'keyed-list' };

it('carries every node in fragment and array slots', async () => {
  const home = await createRuntimePlugins([listFixture]);

  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const input = { pluginId: 'list', path: '/slots' };

  const watching = createCaller({ signal: controller.signal });
  const stream = (await watching.plugins.view(input))[Symbol.asyncIterator]();

  const initial = (await stream.next()).value;
  expect(initial).toMatchObject({
    type: 'snapshot',
    root: {
      props: { title: 'Slotted row' },
      slots: {
        leading: [
          { props: { children: 'First' } },
          { props: { children: 'Second' } },
        ],
        trailing: [
          {
            props: {
              label: 'Increment',
              onPress: { $event: 'onPress' },
            },
          },
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
    const home = await createRuntimePlugins([listFixture]);
    const { createCaller } = await startEngineTestHost({ home });
    const controller = new AbortController();
    onTestFinished(() => controller.abort());
    const input = { pluginId: 'list', path };

    const watching = createCaller({ signal: controller.signal });
    const stream = (await watching.plugins.view(input))[Symbol.asyncIterator]();

    const initial = (await stream.next()).value;
    await watching.plugins.dispatch(
      pluginTap(initial, { ...input, key: slotKey }),
    );
    expect((await stream.next()).value).toEqual({
      type: 'patch',
      viewId: initial.viewId,
      revision: 2,
      ops,
    });
  },
  10_000,
);
