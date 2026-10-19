import {
  counterSnapshot,
  counterTapPatch,
} from '@repo/contracts/plugins/wire-fixtures';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const counter = { pluginId: 'counter', path: '/' };

it('streams the counter fixture as the wire fixtures describe and delivers a tap to its handler', async () => {
  const home = await createRuntimePlugins([
    { id: 'counter', fixture: 'wire-counter', main: 'index.js' },
  ]);

  const { createCaller } = await startEngineTestHost({
    home,
  });

  const controller = new AbortController();

  const app = createCaller({ signal: controller.signal });
  const view = await app.plugins.view(counter);

  const messages = view[Symbol.asyncIterator]();

  const snapshot = (await messages.next()).value;
  expect(snapshot).toMatchObject(counterSnapshot);

  await app.plugins.dispatch({
    ...counter,
    revision: 1,
    viewId: snapshot.viewId,
    key: '0/4/0',
    event: 'onPress',
  });

  expect((await messages.next()).value).toMatchObject(counterTapPatch);
  controller.abort();
}, 20_000);

it.each([
  { connection: 'same', revision: 2, label: 'Tapped 1 times' },
  { connection: 'different', revision: 3, label: 'Tapped 0 times' },
])(
  'gives a late subscriber on a $connection Connection its current page',
  async ({ connection, revision, label }) => {
    const home = await createRuntimePlugins([
      { id: 'counter', fixture: 'wire-counter', main: 'index.js' },
    ]);

    const { createCaller } = await startEngineTestHost({
      home,
    });

    const first = new AbortController();
    const second = new AbortController();

    const app = createCaller({ signal: first.signal });
    const early = (await app.plugins.view(counter))[Symbol.asyncIterator]();

    const snapshot = (await early.next()).value;
    await app.plugins.dispatch({
      ...counter,
      revision: 1,
      viewId: snapshot.viewId,
      key: '0/4/0',
      event: 'onPress',
    });
    await early.next();

    const lateApp =
      connection === 'same' ? app : createCaller({ signal: second.signal });

    const late = (await lateApp.plugins.view(counter))[Symbol.asyncIterator]();

    expect((await late.next()).value).toMatchObject({
      type: 'snapshot',
      revision,
      root: {
        children: [
          { type: 'Text' },
          { props: { children: label } },
          { type: 'Pill', props: { text: 'Healthy', tone: 'success' } },
          {
            type: 'ListItem',
            props: {
              title: 'Waiting jobs',
              badge: { kind: 'count', count: 3, label: '3 queued jobs' },
            },
          },
          { type: 'Stack', props: { direction: 'row' } },
        ],
      },
    });
    first.abort();
    second.abort();
  },
  20_000,
);

it('refuses className on a Plugin component by reporting that Plugin as crashed', async () => {
  const home = await createRuntimePlugins([
    { id: 'styled', fixture: 'class-name' },
  ]);

  const { caller, createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();

  const view = await createCaller({ signal: controller.signal }).plugins.view({
    pluginId: 'styled',
    path: '/',
  });

  void view[Symbol.asyncIterator]().next();

  await expect
    .poll(() => caller.plugins.list(), { timeout: 10_000 })
    .toMatchObject({
      plugins: [
        {
          state: 'crashed',
          error: 'Text: className is not allowed on Plugin components',
        },
      ],
    });
  controller.abort();
}, 20_000);
