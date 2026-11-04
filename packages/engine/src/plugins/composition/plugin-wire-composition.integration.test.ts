import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { WireNode } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { drawnRoot, liveAnswers, pageAt } from '#mocks/plugin-pages';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const listFixture = { id: 'list', fixture: 'keyed-list' };

const listRows = (root: WireNode): WireNode[] =>
  root.children[0]?.children ?? [];

it('sends one keyed insert when a live page prepends to its 2,000 rows', async () => {
  const home = await createRuntimePlugins([listFixture]);
  const host = await startEngineTestHost({ home });
  const [first, patch] = await liveAnswers(host, pageAt('list', '/prepend'), 2);

  if (first?.kind !== 'tree') throw new Error('Expected a tree');

  expect(listRows(first.root)).toHaveLength(2000);
  expect(patch).toMatchObject({
    kind: 'patch',
    base: first.hash,
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
}, 20_000);

it('sends one move op when a live page moves its first row to the end', async () => {
  const home = await createRuntimePlugins([listFixture]);
  const host = await startEngineTestHost({ home });
  const [, patch] = await liveAnswers(host, pageAt('list', '/move'), 2);

  expect(patch).toMatchObject({
    kind: 'patch',
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
    const { caller } = await startEngineTestHost({ home });
    const draw = { ...pageAt('list', path), pages: 1 };

    await expect(caller.plugins.draw(draw)).resolves.toEqual({
      kind: 'failed',
      error,
    });
    await caller.plugins.draw(draw);
    expect(await caller.plugin.list()).toMatchObject({
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

it.each([
  { path: '/custom', text: 'row' },
  { path: '/fragment', text: 'row' },
  { path: '/indexed', text: '0:row' },
])(
  'preserves the key and expansion content of a $path list row',
  async ({ path, text }) => {
    const home = await createRuntimePlugins([listFixture]);
    const { caller } = await startEngineTestHost({ home });

    await expect(
      drawnRoot(caller, pageAt('list', path)),
    ).resolves.toMatchObject({
      props: {},
      children: [{ type: 'Text', key: 'row', props: { children: text } }],
    });
  },
  10_000,
);
