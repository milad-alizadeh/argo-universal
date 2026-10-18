import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const fixture = { id: 'edges', fixture: 'wire-edge-cases' };

it('keeps positional and explicit children distinct through a patch', async () => {
  const home = await createRuntimePlugins([fixture]);

  const { caller, createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const input = { pluginId: 'edges', path: '/mixed' };

  const stream = (
    await createCaller({ signal: controller.signal }).plugins.view(input)
  )[Symbol.asyncIterator]();

  const initial = (await stream.next()).value;

  expect(initial).toMatchObject({
    type: 'snapshot',
    root: {
      children: [
        { key: '1', props: { label: 'Change' } },
        { key: '~~1', props: { label: 'Original' } },
        { key: '~1', props: { label: 'Reserved-looking key' } },
      ],
    },
  });
  await caller.plugins.dispatch({ ...input, eventId: '0/1:onPress' });
  expect((await stream.next()).value).toEqual({
    type: 'patch',
    revision: 2,
    ops: [{ op: 'setProps', key: ['~~1'], props: { label: 'Changed' } }],
  });
}, 10_000);

it('ignores empty React children in slot arrays and inserts a conditional node', async () => {
  const home = await createRuntimePlugins([fixture]);

  const { caller, createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const input = { pluginId: 'edges', path: '/conditional' };

  const stream = (
    await createCaller({ signal: controller.signal }).plugins.view(input)
  )[Symbol.asyncIterator]();

  expect((await stream.next()).value).toMatchObject({
    type: 'snapshot',
    root: {
      slots: { accessories: [{ key: 'always', props: { label: 'Always' } }] },
    },
  });
  await caller.plugins.dispatch({ ...input, eventId: '0:onPress' });
  expect((await stream.next()).value).toEqual({
    type: 'patch',
    revision: 2,
    ops: [
      {
        op: 'insert',
        parent: [],
        slot: 'accessories',
        index: 0,
        node: {
          type: 'Text',
          key: 'optional',
          props: { label: 'Optional' },
          children: [],
          slots: {},
        },
      },
    ],
  });
}, 10_000);
