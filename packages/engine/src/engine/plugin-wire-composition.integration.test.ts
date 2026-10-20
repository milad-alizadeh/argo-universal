import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { expect, it, onTestFinished } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { pluginTap } from '#mocks/plugin-app';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const listFixture = { id: 'list', fixture: 'keyed-list' };

it('prepending to 2,000 Plugin rows sends one keyed insert and retains the full tree for a late viewer', async () => {
  const home = await createRuntimePlugins([listFixture]);

  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const watching = createCaller({ signal: controller.signal });
  const input = { pluginId: 'list', path: '/' };
  const stream = (await watching.plugins.view(input))[Symbol.asyncIterator]();
  const initial = (await stream.next()).value;

  expect(rowsOf(initial)).toHaveLength(2000);
  await watching.plugins.dispatch(
    pluginTap(initial, { ...input, key: '0/prepend' }),
  );
  expect((await stream.next()).value).toEqual({
    type: 'patch',
    viewId: initial.viewId,
    revision: 2,
    ops: [
      {
        op: 'insert',
        parent: ['list'],
        index: 0,
        node: {
          type: 'Text',
          key: 'new',
          props: { children: 'new' },
          children: [],
          slots: {},
        },
      },
    ],
  });
  const late = (await watching.plugins.view(input))[Symbol.asyncIterator]();
  const snapshot = (await late.next()).value;

  expect(rowsOf(snapshot)).toHaveLength(2001);
  expect(rowsOf(snapshot)[0]).toMatchObject({ props: { children: 'new' } });
}, 20_000);

it('moving the first row to the end sends one move op', async () => {
  const home = await createRuntimePlugins([listFixture]);

  const { createCaller } = await startEngineTestHost({ home });
  const controller = new AbortController();
  onTestFinished(() => controller.abort());
  const input = { pluginId: 'list', path: '/' };

  const watching = createCaller({ signal: controller.signal });
  const stream = (await watching.plugins.view(input))[Symbol.asyncIterator]();

  const initial = (await stream.next()).value;
  await watching.plugins.dispatch(
    pluginTap(initial, { ...input, key: '0/move' }),
  );
  expect((await stream.next()).value).toEqual({
    type: 'patch',
    viewId: initial.viewId,
    revision: 2,
    ops: [{ op: 'move', key: ['list', '0'], parent: ['list'], index: 1999 }],
  });
}, 20_000);

it.each([
  { path: '/missing', error: 'List: every list child needs a key' },
  { path: '/duplicate', error: 'List: duplicate child key row' },
])(
  'refuses $path list keys with one log line and a local drawing failure',
  async ({ path, error }) => {
    const home = await createRuntimePlugins([listFixture]);

    const { caller, createCaller } = await startEngineTestHost({ home });
    const controller = new AbortController();
    onTestFinished(() => controller.abort());

    const watching = createCaller({ signal: controller.signal });

    const failures = (await watching.plugins.failures())[
      Symbol.asyncIterator
    ]();

    expect((await failures.next()).value).toEqual([]);
    const view = await watching.plugins.view({ pluginId: 'list', path });

    expect(await view[Symbol.asyncIterator]().next()).toMatchObject({
      done: true,
    });
    expect((await failures.next()).value).toMatchObject([
      { pluginId: 'list', kind: 'drawing', message: error },
    ]);
    expect(await caller.plugins.list()).toMatchObject({
      plugins: [{ state: 'running', error: null }],
    });
    const log = await readFile(join(home, 'logs/plugins.log'), 'utf8');
    expect(
      log
        .split('\n')
        .filter((line) =>
          line.includes(`Plugin list: could not draw ${path}: ${error}`),
        ),
    ).toHaveLength(1);
  },
  10_000,
);

function rowsOf(message: ViewMessage | void): WireNode[] {
  if (message?.type !== 'snapshot') throw new Error('Expected a snapshot');

  return listRows(message.root);
}

const listRows = (root: WireNode): WireNode[] =>
  root.children[2]?.children ?? [];

it.each([
  { path: '/custom', text: 'row' },
  { path: '/fragment', text: 'row' },
  { path: '/indexed', text: '0:row' },
])(
  'preserves the key and expansion content of a $path list row',
  async ({ path, text }) => {
    const home = await createRuntimePlugins([listFixture]);
    const { createCaller } = await startEngineTestHost({ home });
    const controller = new AbortController();
    onTestFinished(() => controller.abort());

    const stream = (
      await createCaller({ signal: controller.signal }).plugins.view({
        pluginId: 'list',
        path,
      })
    )[Symbol.asyncIterator]();

    expect((await stream.next()).value).toMatchObject({
      type: 'snapshot',
      root: {
        props: {},
        children: [{ type: 'Text', key: 'row', props: { children: text } }],
      },
    });
  },
  10_000,
);
