import { expect, it } from 'vitest';
import type { WireNode } from './wire';
import { applyPatch, diff } from './wire-patch';

const text = (key: string, children = key): WireNode => ({
  type: 'Text',
  key,
  props: { children },
  children: [],
  slots: {},
});

const stack = (
  children: WireNode[],
  slots: WireNode['slots'] = {},
): WireNode => ({
  type: 'Stack',
  key: 'root',
  props: { direction: 'column' },
  children,
  slots,
});

const rows = ['a', 'b', 'c', 'd'].map((key) => text(key));

it.each([
  { change: 'an inserted row', after: stack([text('new'), ...rows]) },
  { change: 'a removed row', after: stack(rows.slice(1)) },
  {
    change: 'a changed prop',
    after: stack([text('a', 'A'), ...rows.slice(1)]),
  },
  { change: 'a reorder', after: stack(rows.toReversed()) },
  { change: 'a new slot', after: stack(rows, { leading: [text('icon')] }) },
  { change: 'a new root type', after: { ...text('root'), children: rows } },
])('patches $change back into the next tree', ({ after }) => {
  const before = stack(rows);

  expect(applyPatch(before, diff(before, after))).toEqual(after);
});

it('moves one row to the end with one op', () => {
  const [first, ...rest] = rows;

  if (!first) throw new Error('Expected rows');

  expect(diff(stack(rows), stack([...rest, first]))).toEqual([
    { op: 'move', key: ['a'], parent: [], slot: undefined, index: 3 },
  ]);
});

it('finds nothing to send between equal trees', () => {
  expect(diff(stack(rows), stack(rows))).toEqual([]);
});
