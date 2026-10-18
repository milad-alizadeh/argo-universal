import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const editsFixture = { id: 'edits', fixture: 'wire-edits' };

const nextEvent = '0/next:onPress';

it('publishes changed and removed properties', async () => {
  const path = '/props';

  const home = await createRuntimePlugins([editsFixture]);

  const { caller, createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();

  onTestFinished(() => controller.abort());
  const watching = createCaller({ signal: controller.signal });
  const input = { pluginId: 'edits', path };
  const stream = (await watching.plugins.view(input))[Symbol.asyncIterator]();

  await stream.next();
  await caller.plugins.dispatch({ ...input, eventId: nextEvent });
  expect((await stream.next()).value).toEqual({
    type: 'patch',
    revision: 2,
    ops: [
      {
        op: 'setProps',
        key: ['kept'],
        props: { label: 'Changed' },
        unset: ['tone'],
      },
    ],
  });
}, 10_000);

it('replaces a changed type and retains it for a late viewer', async () => {
  const path = '/replace';

  const home = await createRuntimePlugins([editsFixture]);

  const { caller, createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();

  onTestFinished(() => controller.abort());
  const watching = createCaller({ signal: controller.signal });
  const input = { pluginId: 'edits', path };
  const stream = (await watching.plugins.view(input))[Symbol.asyncIterator]();

  await stream.next();
  await caller.plugins.dispatch({ ...input, eventId: nextEvent });
  expect((await stream.next()).value).toEqual({
    type: 'patch',
    revision: 2,
    ops: [
      {
        op: 'replace',
        key: ['kept'],
        node: {
          type: 'Button',
          key: 'kept',
          props: { label: 'Changed' },
          children: [],
          slots: {},
        },
      },
    ],
  });
  const late = (await watching.plugins.view(input))[Symbol.asyncIterator]();

  expect((await late.next()).value).toMatchObject({
    type: 'snapshot',
    root: {
      children: [
        { key: 'next' },
        { type: 'Button', key: 'kept', props: { label: 'Changed' } },
      ],
    },
  });
}, 10_000);

it('removes a keyed row', async () => {
  const path = '/remove';

  const home = await createRuntimePlugins([editsFixture]);

  const { caller, createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();

  onTestFinished(() => controller.abort());
  const watching = createCaller({ signal: controller.signal });
  const input = { pluginId: 'edits', path };
  const stream = (await watching.plugins.view(input))[Symbol.asyncIterator]();

  await stream.next();
  await caller.plugins.dispatch({ ...input, eventId: nextEvent });
  expect((await stream.next()).value).toEqual({
    type: 'patch',
    revision: 2,
    ops: [{ op: 'remove', key: ['removed'] }],
  });
}, 10_000);
