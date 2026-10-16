import { fileURLToPath } from 'node:url';
import { WireEvent } from '@repo/contracts/plugins/wire';
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
  const { caller, createCaller } = await startEngineTestHost({
    home,
    // The Server's own version, which `plugins/examples/hello` supports.
    version: '0.0.0',
    firstPartyPluginsDirectory: examples,
  });
  const controller = new AbortController();
  const view = await createCaller({ signal: controller.signal }).plugins.view(
    hello,
  );
  const messages = view[Symbol.asyncIterator]();

  expect((await messages.next()).value).toEqual(helloSnapshot);

  await caller.plugins.dispatch({ ...hello, eventId: tapEventId() });

  expect((await messages.next()).value).toEqual(helloTapPatch);
  controller.abort();
}, 20_000);

// The event id the fixture gives "Tap me".
function tapEventId(): string {
  if (helloSnapshot.type !== 'snapshot') throw new Error('Fixture is a snapshot');
  const handler = helloSnapshot.root.children.at(2)?.children.at(0)?.props.onPress;

  return WireEvent.parse(handler).$event;
}

it('gives a second viewer the current page as a fresh snapshot, with a revision after what the first saw', async () => {
  const home = await createRuntimePlugins([]);
  const { caller, createCaller } = await startEngineTestHost({
    home,
    version: '0.0.0',
    firstPartyPluginsDirectory: examples,
  });
  const first = new AbortController();
  const second = new AbortController();
  const early = (
    await createCaller({ signal: first.signal }).plugins.view(hello)
  )[Symbol.asyncIterator]();

  await early.next();
  await caller.plugins.dispatch({ ...hello, eventId: tapEventId() });
  await early.next();

  const late = (
    await createCaller({ signal: second.signal }).plugins.view(hello)
  )[Symbol.asyncIterator]();

  expect((await late.next()).value).toMatchObject({
    type: 'snapshot',
    revision: 2,
    root: { children: [{}, { props: { label: 'Tapped 1 times' } }, {}] },
  });
  first.abort();
  second.abort();
}, 20_000);

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
