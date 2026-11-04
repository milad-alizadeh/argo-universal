import { expect, it } from 'vitest';
import { optimisticTree, optimisticUndo } from './optimistic-tree';
import type { WireNode } from './wire';

const node = (key: string, props: WireNode['props']): WireNode => ({
  type: 'Button',
  key,
  props,
  children: [],
  slots: {},
});

const stack = (...children: WireNode[]): WireNode => ({
  ...node('stack', {}),
  children,
});

const optimistic = [{ key: 'save', props: { label: 'Saving', loading: true } }];

it('takes back the props a node lacked before, and the ones it had, leaving the others', () => {
  const before = stack(node('save', { label: 'Save', tone: 'primary' }));
  const shown = optimisticTree(before, optimistic);
  const moved = stack(
    node('save', { ...shown.children[0]?.props, tone: 'danger' }),
  );

  expect(optimisticUndo(before, optimistic)(moved)).toEqual(
    stack(node('save', { label: 'Save', tone: 'danger' })),
  );
});

it('leaves a node alone that no longer shows the optimistic props, as a tree drawn since does not', () => {
  const before = stack(node('save', { label: 'Save' }));
  const redrawn = stack(node('save', { label: 'Saved' }));

  expect(optimisticUndo(before, optimistic)(redrawn)).toBe(redrawn);
});
