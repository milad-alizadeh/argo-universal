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

const text = (key: string, props: WireNode['props']): WireNode => ({
  ...node(key, props),
  type: 'Text',
});

it('shows a prop that fits its kit component and drops one that does not', () => {
  const before = stack(text('note', { children: 'Open', tone: 'muted' }));

  const shown = optimisticTree(before, [
    { key: 'note', props: { children: 'Closing', tone: 'not-a-tone' } },
  ]);

  expect(shown.children[0]?.props).toEqual({
    children: 'Closing',
    tone: 'muted',
  });
});

it('shows no prop a Plugin may not set on a node, such as a class or a style', () => {
  const before = stack(text('note', { children: 'Open' }));

  const shown = optimisticTree(before, [
    { key: 'note', props: { className: 'p-4', style: 'x', children: 'Hi' } },
  ]);

  expect(shown.children[0]?.props).toEqual({ children: 'Hi' });
});

it('takes back a prop it showed even when another of the same patch was dropped', () => {
  const before = stack(text('note', { children: 'Open' }));
  const patch = [{ key: 'note', props: { children: 'Closing', tone: 'bad' } }];

  const shown = optimisticTree(before, patch);

  expect(optimisticUndo(before, patch)(shown)).toEqual(before);
});

it('takes back each node of a shared key to the props it had itself', () => {
  const before = stack(
    { ...stack(text('note', { children: 'First' })), key: 'one' },
    { ...stack(text('note', { children: 'Second' })), key: 'two' },
  );

  const patch = [{ key: 'note', props: { children: 'Closing' } }];

  const shown = optimisticTree(before, patch);

  expect(optimisticUndo(before, patch)(shown)).toEqual(before);
});
