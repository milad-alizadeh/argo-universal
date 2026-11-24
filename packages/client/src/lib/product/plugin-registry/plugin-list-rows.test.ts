import type { WireNode } from '@repo/contracts/plugins/wire';
import { describe, expect, it } from 'vitest';
import { listEntriesOf, listRowsOf, tableRowsOf } from './plugin-list-rows';

const node = (
  type: string,
  key: string,
  parts: Partial<WireNode> = {},
): WireNode => ({ type, key, props: {}, slots: {}, children: [], ...parts });

const list = (children: WireNode[], props: WireNode['props'] = {}): WireNode =>
  node('List', 'rows', { props, children });

describe('listRowsOf', () => {
  const rows = [node('ListItem', 'a'), node('SessionRow', 'b')];

  it('hands a flat List its nodes as data, keyed by node key and typed by node type', () => {
    const data = listRowsOf(list(rows));

    expect(data?.items).toBe(rows);
    expect(rows.map((row, index) => data?.keyExtractor(row, index))).toEqual([
      'a',
      'b',
    ]);
    expect(rows.map((row, index) => data?.getItemType(row, index))).toEqual([
      'ListItem',
      'SessionRow',
    ]);
    expect(data?.recycleItems).toBe(true);
  });

  it.each([
    ['a Section', list([node('List.Section', 's', { children: rows })])],
    [
      'a nested row',
      list([node('ListItem', 'a', { children: [node('ListItem', 'b')] })]),
    ],
    ['a native FieldGroup row', list([node('FieldGroup.Row', 'f')])],
    ['moves', list(rows, { onMove: { operation: 'move' } })],
    ['a grid', list(rows, { layout: 'grid' })],
    ['a horizontal List', list(rows, { direction: 'horizontal' })],
  ])('leaves a List with %s to its children', (_name, tree) => {
    expect(listRowsOf(tree)).toBeUndefined();
  });

  it('hands a Table its row nodes as items, with no list identity of its own', () => {
    const tableRows = [node('Table.Row', 'r1'), node('Table.Row', 'r2')];
    const data = tableRowsOf(node('Table', 't', { children: tableRows }));

    expect(data).toEqual({ items: tableRows });
  });

  it('leaves a node that is not a List alone', () => {
    expect(listRowsOf(node('Stack', 's', { children: rows }))).toBeUndefined();
  });

  describe('listEntriesOf', () => {
    const section = node('List.Section', 's', {
      props: { title: 'Fruit' },
      children: rows,
    });

    const props = (given: WireNode): { title?: string } => ({
      title: String(given.props.title),
    });

    it('holds Sections and rows as entries, with the address each row draws at', () => {
      const loose = node('ListItem', 'x');
      const entries = listEntriesOf(list([section, loose]), 'rows', props);

      expect(entries).toEqual([
        {
          key: 's',
          section: { title: 'Fruit' },
          entries: [
            { key: 'a', item: { node: rows[0], key: 'rows/s/a' } },
            { key: 'b', item: { node: rows[1], key: 'rows/s/b' } },
          ],
        },
        { key: 'x', item: { node: loose, key: 'rows/x' } },
      ]);
    });

    it('keeps a List of moves as entries', () => {
      const moving = list(rows, { onMove: { operation: 'move' } });

      expect(listEntriesOf(moving, 'rows', props)).toHaveLength(2);
    });

    it.each([
      ['a native FieldGroup row', list([node('FieldGroup.Row', 'f')])],
      [
        'a native row in a Section',
        list([
          node('List.Section', 's', { children: [node('FieldGroup', 'f')] }),
        ]),
      ],
      ['a node that is not a List', node('Stack', 'k', { children: rows })],
    ])('leaves %s to its children', (_name, tree) => {
      expect(listEntriesOf(tree, 'rows', props)).toBeUndefined();
    });
  });
});
