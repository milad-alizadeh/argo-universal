import { expect, it } from 'vitest';
import { innermostAt, titleOf, type Placed } from './draft-comment-hit';

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

it('names a node by its region, the Variant letter and its key, or its key alone outside a region', () => {
  expect(
    titleOf({ nodeKey: 'row-409', place: { label: 'List', letter: 'A' } }),
  ).toBe('List · A · row-409');
  expect(titleOf({ nodeKey: 'title', place: null })).toBe('title');
});
