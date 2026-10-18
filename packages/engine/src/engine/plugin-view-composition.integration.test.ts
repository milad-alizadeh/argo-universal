import { fileURLToPath } from 'node:url';
import {
  helloSnapshot,
  helloTapPatch,
} from '@repo/contracts/plugins/wire-fixtures';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const examples = fileURLToPath(
  new URL('../../../../plugins/examples', import.meta.url),
);

const hello = { pluginId: 'hello', path: '/' };

it('streams the hello page as the wire fixtures describe and delivers a tap to its handler', async () => {
  const home = await createRuntimePlugins([]);

  const { createCaller } = await startEngineTestHost({
    home,
    // The Server's own version, which `plugins/examples/hello` supports.
    version: '0.0.0',
    firstPartyPluginsDirectory: examples,
  });

  const controller = new AbortController();

  const app = createCaller({ signal: controller.signal });
  const view = await app.plugins.view(hello);

  const messages = view[Symbol.asyncIterator]();

  const snapshot = (await messages.next()).value;
  expect(snapshot).toMatchObject(helloSnapshot);

  await app.plugins.dispatch({
    ...hello,
    revision: 1,
    viewId: snapshot.viewId,
    key: '0/2/0',
    event: 'onPress',
  });

  expect((await messages.next()).value).toMatchObject(helloTapPatch);
  controller.abort();
}, 20_000);

it.each([
  { connection: 'same', revision: 2, label: 'Tapped 1 times' },
  { connection: 'different', revision: 3, label: 'Tapped 0 times' },
])(
  'gives a late subscriber on a $connection Connection its current page',
  async ({ connection, revision, label }) => {
    const home = await createRuntimePlugins([]);

    const { createCaller } = await startEngineTestHost({
      home,
      version: '0.0.0',
      firstPartyPluginsDirectory: examples,
    });

    const first = new AbortController();
    const second = new AbortController();

    const app = createCaller({ signal: first.signal });
    const early = (await app.plugins.view(hello))[Symbol.asyncIterator]();

    const snapshot = (await early.next()).value;
    await app.plugins.dispatch({
      ...hello,
      revision: 1,
      viewId: snapshot.viewId,
      key: '0/2/0',
      event: 'onPress',
    });
    await early.next();

    const lateApp =
      connection === 'same' ? app : createCaller({ signal: second.signal });

    const late = (await lateApp.plugins.view(hello))[Symbol.asyncIterator]();

    expect((await late.next()).value).toMatchObject({
      type: 'snapshot',
      revision,
      root: { children: [{}, { props: { label } }, {}] },
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
