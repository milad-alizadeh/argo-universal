import type { WireNode } from '@repo/contracts/plugins/wire';
import { describe, expect, it } from 'vitest';
import { listEntriesOf, listRowsOf, tableRowsOf } from './plugin-list-rows';

const sectionType = 'List.Section';

const rowType = 'ListItem';

// What the renderer would draw for a Section: here, just its key.
interface Drawn {
  drawnFor: string;
}

const sectionKeyed = (given: WireNode): Drawn => ({
  drawnFor: given.key,
});

const node = (
  type: string,
  key: string,
  parts: Partial<WireNode> = {},
): WireNode => ({ type, key, props: {}, slots: {}, children: [], ...parts });

const list = (children: WireNode[], props: WireNode['props'] = {}): WireNode =>
  node('List', 'rows', { props, children });

describe('listRowsOf', () => {
  const rows = [node(rowType, 'a'), node('SessionRow', 'b')];

  it('hands a flat List its nodes as data, keyed by node key and typed by node type', () => {
    const data = listRowsOf(list(rows));

    expect(data?.items).toBe(rows);
    expect(rows.map((row, index) => data?.keyExtractor(row, index))).toEqual([
      'a',
      'b',
    ]);
    expect(rows.map((row, index) => data?.getItemType(row, index))).toEqual([
      rowType,
      'SessionRow',
    ]);
    expect(data?.recycleItems).toBe(true);
  });

  it.each([
    ['a Section', list([node(sectionType, 's', { children: rows })])],
    [
      'a nested row',
      list([node(rowType, 'a', { children: [node(rowType, 'b')] })]),
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
    const section = node(sectionType, 's', {
      props: { title: 'Fruit' },
      children: rows,
    });

    it('holds Sections and rows as entries, with the address each row draws at', () => {
      const loose = node(rowType, 'x');

      const entries = listEntriesOf(
        list([section, loose]),
        'rows',
        sectionKeyed,
      );

      expect(entries).toEqual([
        {
          key: 's',
          section: { drawnFor: 's' },
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

      expect(listEntriesOf(moving, 'rows', sectionKeyed)).toHaveLength(2);
    });

    it.each([
      ['a native FieldGroup row', list([node('FieldGroup.Row', 'f')])],
      [
        'a native row in a Section',
        list([node(sectionType, 's', { children: [node('FieldGroup', 'f')] })]),
      ],
      ['a node that is not a List', node('Stack', 'k', { children: rows })],
    ])('leaves %s to its children', (_name, tree) => {
      expect(listEntriesOf(tree, 'rows', sectionKeyed)).toBeUndefined();
    });
  });
});
