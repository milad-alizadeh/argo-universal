import { expect, it } from 'vitest';
import { prepareWireTree } from '../prepare-tree';
import type { WireNode } from '../wire';

const updateMessage = 'Update Argo to see this';

const row = (key: string, children: WireNode[] = []): WireNode => ({
  type: 'ListItem',
  key,
  props: { title: key },
  children,
  slots: {},
});

it('keeps child ListItems nested under a row, at any depth', () => {
  const tree = row('parent', [row('child', [row('grandchild')]), row('last')]);

  expect(prepareWireTree(tree)).toEqual(tree);
});

it.each(['Text', 'Button'])('refuses a %s child of a row', (type) => {
  const tree = row('parent', [
    { type, key: 'stray', props: {}, children: [], slots: {} },
  ]);

  expect(prepareWireTree(tree)).toMatchObject({
    type: 'Text',
    props: { children: updateMessage },
  });
});

it.each(['regular', 'compact'])('draws a List with %s density', (density) => {
  const list: WireNode = {
    type: 'List',
    key: 'list',
    props: { density },
    children: [row('only')],
    slots: {},
  };

  expect(prepareWireTree(list)).toEqual(list);
});

it('refuses a density the List does not declare', () => {
  const list: WireNode = {
    type: 'List',
    key: 'list',
    props: { density: 'dense' },
    children: [],
    slots: {},
  };

  expect(prepareWireTree(list)).toMatchObject({
    type: 'Text',
    props: { children: updateMessage },
  });
});
