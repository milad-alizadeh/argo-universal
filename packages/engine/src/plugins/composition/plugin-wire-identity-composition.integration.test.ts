import { expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import { liveAnswers, pageAt } from '#mocks/plugin-pages';
import { createRuntimePlugins } from '#mocks/runtime-plugins';

const fixture = { id: 'edges', fixture: 'wire-edge-cases' };

async function liveEdges(
  path: string,
): Promise<Awaited<ReturnType<typeof liveAnswers>>> {
  const home = await createRuntimePlugins([fixture]);
  const host = await startEngineTestHost({ home });

  return liveAnswers(host, pageAt('edges', path), 2);
}

it('keeps positional and explicit children distinct through a patch', async () => {
  const [first, patch] = await liveEdges('/mixed');

  expect(first).toMatchObject({
    kind: 'tree',
    root: {
      children: [
        { key: '1', props: { label: 'Change' } },
        { key: '~~1', props: { children: 'Original' } },
        { key: '~1', props: { children: 'Reserved-looking key' } },
      ],
    },
  });
  expect(patch).toMatchObject({
    kind: 'patch',
    ops: [{ op: 'setProps', key: ['~~1'], props: { children: 'Changed' } }],
  });
}, 10_000);

it('ignores empty React children in slot arrays and inserts a conditional node', async () => {
  const [first, patch] = await liveEdges('/conditional');

  expect(first).toMatchObject({
    kind: 'tree',
    root: {
      slots: { trailing: [{ key: 'always', props: { children: 'Always' } }] },
    },
  });
  expect(patch).toMatchObject({
    kind: 'patch',
    ops: [
      {
        op: 'insert',
        parent: [],
        slot: 'trailing',
        index: 0,
        node: {
          type: 'Text',
          key: 'optional',
          props: { children: 'Optional' },
          children: [],
          slots: {},
        },
      },
    ],
  });
}, 10_000);
