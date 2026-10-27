import type { ViewMessage, WireNode } from '@repo/contracts/plugins/wire';
import { nextRoot } from '@repo/contracts/plugins/wire-patch';
import { expect, it } from 'vitest';
import { drawn, leaf, map, stack, type Drawn } from './draw-tree-fixtures';

const before = leaf('label', { children: 'Before' });

const page = stack([{ ...leaf('unknown', {}), type: 'FutureLeaf' }, before]);

const setLabel = (revision: number, props: WireNode['props']): ViewMessage => ({
  type: 'patch',
  revision,
  ops: [{ op: 'setProps', key: ['label'], props }],
});

const after = { children: 'After' };

const prunedAndPatched = (): Drawn =>
  drawn(
    [
      { type: 'snapshot', revision: 1, root: page },
      setLabel(2, after),
      setLabel(3, { ...after, futureProp: 'Unknown optional prop' }),
    ],
    map,
  );

it('rebases patches after pruning', () => {
  const { view, sent } = prunedAndPatched();

  expect(sent.slice(0, 2)).toEqual([
    {
      type: 'snapshot',
      revision: 1,
      viewId: view.opening.viewId,
      root: stack([before]),
    },
    { ...setLabel(2, after), viewId: view.opening.viewId },
  ]);
});

it('advances the revision for a patch that only sets stripped props', () => {
  const { view, sent } = prunedAndPatched();

  expect(sent.at(-1)).toEqual({
    type: 'snapshot',
    revision: 3,
    viewId: view.opening.viewId,
    root: stack([leaf('label', after)]),
  });
});

it('recovers when an invalid container becomes valid in a patch', () => {
  const { sent } = drawn(
    [
      {
        type: 'snapshot',
        revision: 1,
        root: { ...page, props: { direction: 'broken' } },
      },
      {
        type: 'patch',
        revision: 2,
        ops: [{ op: 'setProps', key: [], props: { direction: 'column' } }],
      },
    ],
    map,
  );

  expect(sent).toMatchObject([
    {
      type: 'snapshot',
      root: { type: 'Text', props: { children: 'Update Argo to see this' } },
    },
    {
      type: 'patch',
      ops: [{ op: 'replace', key: [], node: { type: 'Stack' } }],
    },
  ]);
  expect(sent.reduce<WireNode | null>(nextRoot, null)).toEqual(stack([before]));
});
