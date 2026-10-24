import { expect, it } from 'vitest';
import { prepareWireTree } from './prepare-tree';
import type { WireNode } from './wire';

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
): WireNode => ({
  type,
  key,
  props,
  children: [],
  slots: {},
});

const parent = (owner: WireNode, children: WireNode[]): WireNode => ({
  ...owner,
  children,
});

const press = (key: string, label: string): WireNode =>
  node('Action', key, {
    label,
    icon: 'external-link',
    onPress: { $event: 'onPress' },
  });

const sort = parent(
  node('Action', 'sort', { label: 'Sort', icon: 'filter-list' }),
  [
    parent(node('Action.Section', 'order', { title: 'Order' }), [
      press('newest', 'Newest'),
    ]),
  ],
);

const row: WireNode = {
  ...node('ListItem', 'row', { title: 'Deploy web' }),
  slots: { actions: [press('open', 'Open'), sort] },
};

const actionKeys = (tree: WireNode): string[] =>
  (tree.slots.actions ?? []).map((child) => child.key);

it('keeps press and submenu Actions side by side', () => {
  expect(actionKeys(prepareWireTree(row))).toEqual(['open', 'sort']);
});

it('keeps a submenu’s keyed Sections and Actions', () => {
  const prepared = prepareWireTree(sort);

  expect(prepared.children[0]?.children.map((child) => child.key)).toEqual([
    'newest',
  ]);
});
