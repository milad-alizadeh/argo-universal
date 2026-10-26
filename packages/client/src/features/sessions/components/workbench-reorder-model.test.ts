import { describe, expect, it } from 'vitest';
import {
  clampOffset,
  dropIndex,
  heldOffset,
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

  it('drops a stored card that is gone and appends a new one', () => {
    expect(orderCards(['a', 'b', 'd'], ['c', 'b', 'a'])).toEqual([
      'b',
      'a',
      'd',
    ]);
  });
});

describe('moveCard', () => {
  it('moves a card down and up', () => {
    expect(moveCard(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveCard(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });

  it('leaves the order alone when the card stays', () => {
    expect(moveCard(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });
});

describe('dropIndex', () => {
  it('stays put until the held card passes a neighbour', () => {
    expect(dropIndex(drag(0, 0))).toBe(0);
    expect(dropIndex(drag(0, 40))).toBe(0);
  });

  it('counts each card whose middle the held card has passed', () => {
    expect(dropIndex(drag(0, 100))).toBe(1);
    expect(dropIndex(drag(0, 200))).toBe(2);
    expect(dropIndex(drag(2, -170))).toBe(0);
  });
});

describe('a pointer that travels further than the column', () => {
  it('still drops a tall card last, though the card is drawn inside the column', () => {
    expect(dropIndex(drag(0, 400))).toBe(2);
    expect(heldOffset(drag(0, 400))).toBe(156);
  });
});

describe('makeRoom', () => {
  it('opens the held card height plus the gap above or below', () => {
    expect(makeRoom(drag(0, 100), 1)).toBe(-108);
    expect(makeRoom(drag(0, 100), 2)).toBe(0);
    expect(makeRoom(drag(2, -150), 0)).toBe(0);
    expect(makeRoom(drag(2, -150), 1)).toBe(88);
  });

  it('never moves the held card', () => {
    expect(makeRoom(drag(1, 80), 1)).toBe(0);
  });
});

describe('clampOffset', () => {
  it('keeps the held card inside the column', () => {
    expect(clampOffset(slots, 1, -500)).toBe(-108);
    expect(clampOffset(slots, 1, 500)).toBe(88);
    expect(clampOffset(slots, 1, 20)).toBe(20);
  });
});
