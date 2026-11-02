import type { WireNode } from '@repo/contracts/plugins/wire';
import { describe, expect, it } from 'vitest';
import { landingOf, listOnly, withSelectedRow } from './plugin-section-tree';

const row = (key: string, path: string): WireNode => ({
  type: 'ListItem',
  key,
  props: { title: key, onPress: { action: 'navigate', path } },
  children: [],
  slots: {},
});

const list: WireNode = {
  type: 'List',
  key: 'rows',
  props: {},
  children: [
    {
      type: 'List.Section',
      key: 'status',
      props: { title: 'Status' },
      children: [
        row('open', '/filters/open'),
        row('closed', '/filters/closed'),
      ],
      slots: {},
    },
  ],
  slots: {},
};

const empty: WireNode = {
  type: 'EmptyState',
  key: 'none',
  props: { title: 'Nothing' },
  children: [],
  slots: {},
};

const root: WireNode = {
  type: 'ListDetail',
  key: 'issues',
  props: { landing: '/filters/open' },
  children: [],
  slots: { list: [list], empty: [empty] },
};

const selectedRows = (tree: WireNode): string[] =>
  (tree.slots.list?.[0]?.children[0]?.children ?? [])
    .filter((node) => node.props.selected === true)
    .map((node) => node.key);

describe('a section list’s selected row', () => {
  it('is the row that links to the shown page', () => {
    expect(selectedRows(withSelectedRow(root, ['/filters/closed']))).toEqual([
      'closed',
    ]);
  });

  it('stays on the row a page was pushed from', () => {
    expect(
      selectedRows(withSelectedRow(root, ['/issues/42', '/filters/open'])),
    ).toEqual(['open']);
  });

  it('is no row for a page no row links to', () => {
    expect(selectedRows(withSelectedRow(root, ['/issues/42']))).toEqual([]);
  });
});

describe('a section root', () => {
  it('names the page it lands on', () => {
    expect(landingOf(root)).toBe('/filters/open');
  });

  it('has no landing when it is not a ListDetail', () => {
    expect(landingOf({ ...root, type: 'Screen' })).toBeUndefined();
  });

  it('keeps only its list for the live view', () => {
    expect(Object.keys(listOnly(root).slots)).toEqual(['list']);
  });
});
