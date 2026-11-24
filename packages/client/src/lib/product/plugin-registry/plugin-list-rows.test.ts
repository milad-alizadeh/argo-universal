import type { WireNode } from '@repo/contracts/plugins/wire';
import { describe, expect, it } from 'vitest';
import { listRowsOf, tableRowsOf } from './plugin-list-rows';

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
});
