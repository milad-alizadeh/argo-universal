import { describe, expect, it } from 'vitest';
import {
  clampOffset,
  dropIndex,
  makeRoom,
  moveCard,
  orderCards,
  type CardSlot,
  type Drag,
} from './workbench-reorder-model';

// Three cards 100, 60 and 80 tall with 8 between them, from the column's top.
const slots: CardSlot[] = [
  { top: 0, height: 100 },
  { top: 108, height: 60 },
  { top: 176, height: 80 },
];

const drag = (from: number, offset: number): Drag => ({
  id: String(from),
  from,
  slots,
  offset,
});

describe('orderCards', () => {
  it('keeps the stored order for the cards still offered', () => {
    expect(orderCards(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('drops a stored card that is gone', () => {
    expect(orderCards(['a', 'b'], ['c', 'b', 'a'])).toEqual(['b', 'a']);
  });

  it('appends a card the order has not met yet', () => {
    expect(orderCards(['a', 'b', 'd'], ['b', 'a'])).toEqual(['b', 'a', 'd']);
  });
});

describe('moveCard', () => {
  it('moves a card down', () => {
    expect(moveCard(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('moves a card up', () => {
    expect(moveCard(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('leaves the order alone when the card stays', () => {
    expect(moveCard(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('dropIndex', () => {
  it.each([
    [0, 0],
    [0, 40],
  ])(
    'stays put until the held card passes a neighbour (%i, %i)',
    (from, offset) => {
      expect(dropIndex(drag(from, offset))).toBe(0);
    },
  );

  it.each([
    [0, 100, 1],
    [0, 200, 2],
    [2, -170, 0],
  ])(
    'counts each card whose middle the held card has passed (%i, %i)',
    (from, offset, expected) => {
      expect(dropIndex(drag(from, offset))).toBe(expected);
    },
  );

  it('still drops a tall card last when the pointer travels further than the column', () => {
    expect(dropIndex(drag(0, 400))).toBe(2);
  });
});

describe('makeRoom', () => {
  it.each([
    { from: 0, offset: 100, index: 1, expected: -108 },
    { from: 0, offset: 100, index: 2, expected: 0 },
    { from: 2, offset: -150, index: 0, expected: 0 },
    { from: 2, offset: -150, index: 1, expected: 88 },
  ])(
    'opens the held card height plus the gap above or below ($from, $offset, $index)',
    ({ from, offset, index, expected }) => {
      expect(makeRoom(drag(from, offset), index)).toBe(expected);
    },
  );

  it('never moves the held card', () => {
    expect(makeRoom(drag(1, 80), 1)).toBe(0);
  });
});

describe('clampOffset', () => {
  it.each([
    [-500, -108],
    [500, 88],
    [20, 20],
  ])('keeps the held card inside the column (%i)', (offset, expected) => {
    expect(clampOffset(slots, 1, offset)).toBe(expected);
  });

  it('draws a tall card at the column end however far the pointer travels', () => {
    expect(clampOffset(slots, 0, 400)).toBe(156);
  });
});
