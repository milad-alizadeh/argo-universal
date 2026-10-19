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
    parent(node('ActionList.Section', 'order', { title: 'Order' }), [
      press('newest', 'Newest'),
    ]),
  ],
);

const list = parent(node('ActionList', 'actions', {}), [
  press('open', 'Open'),
  sort,
]);

const actionKeys = (tree: WireNode): string[] =>
  tree.children
    .filter((child) => child.type === 'Action')
    .map((child) => child.key);

it.each([
  ['keeps a submenu Action for Apps with submenus', 3, ['open', 'sort']],
  ['drops a submenu Action for Apps before submenus', 2, ['open']],
])('%s', (_, version, keys) => {
  const prepared = prepareWireTree(list, {
    ActionList: 1,
    'ActionList.Section': 1,
    Action: version,
  });

  expect(actionKeys(prepared)).toEqual(keys);
});

it('keeps a submenu’s keyed Sections and Actions', () => {
  const prepared = prepareWireTree(sort, {
    'ActionList.Section': 1,
    Action: 3,
  });

  expect(prepared.children[0]?.children.map((child) => child.key)).toEqual([
    'newest',
  ]);
});
