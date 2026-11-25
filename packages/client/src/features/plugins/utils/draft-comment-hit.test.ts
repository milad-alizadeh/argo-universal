import { expect, it } from 'vitest';
import { innermostAt, keyOf, titleOf, type Placed } from './draft-comment-hit';

const page: Placed = { address: 'page', x: 0, y: 0, width: 400, height: 600 };

const list: Placed = {
  address: 'page/list',
  x: 10,
  y: 100,
  width: 380,
  height: 300,
};

const row: Placed = {
  address: 'page/list/row',
  x: 10,
  y: 150,
  width: 380,
  height: 50,
};

const chip: Placed = {
  address: 'page/list/row/chip',
  x: 300,
  y: 160,
  width: 60,
  height: 20,
};

it('picks the smallest node under the point, so the innermost one', () => {
  const boxes = [page, list, row, chip];

  expect(innermostAt(boxes, { x: 320, y: 170 })?.address).toBe(chip.address);
  expect(innermostAt(boxes, { x: 50, y: 170 })?.address).toBe(row.address);
  expect(innermostAt(boxes, { x: 50, y: 120 })?.address).toBe(list.address);
  expect(innermostAt(boxes, { x: 5, y: 5 })?.address).toBe(page.address);
});

it('picks nothing outside every node, and counts an edge as inside', () => {
  expect(innermostAt([list], { x: 0, y: 0 })).toBeNull();
  expect(innermostAt([list], { x: 10, y: 100 })?.address).toBe(list.address);
  expect(innermostAt([list], { x: 390, y: 400 })?.address).toBe(list.address);
});

it('breaks a tie by the node drawn later, which sits over the earlier', () => {
  const same = { ...list, address: 'page/list-over' };

  expect(innermostAt([list, same], { x: 50, y: 120 })?.address).toBe(
    same.address,
  );
});

it('titles a node by its region and Variant, or the first line it shows outside a region', () => {
  const place = { label: 'List', variant: 'rows', letter: 'A' };

  expect(titleOf({ place, text: 'Pairing code expires' })).toBe('List · rows');
  expect(titleOf({ place: null, text: ' Issues ' })).toBe('Issues');
  expect(titleOf({ place: null, text: '' })).toBeNull();
  expect(titleOf({ place: null, text: 'x'.repeat(90) })).toHaveLength(61);
});

it('keeps the key and the Variant letter for a screen reader', () => {
  expect(
    keyOf({ nodeKey: 'row-409', place: { label: 'List', letter: 'A' } }),
  ).toBe('List · A · row-409');
  expect(keyOf({ nodeKey: 'title', place: null })).toBe('title');
});
