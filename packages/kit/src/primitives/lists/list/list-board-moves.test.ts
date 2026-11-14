import { describe, expect, it, vi } from 'vitest';
import { moveEntries } from './list-move-entries';
import {
  rowId,
  sectionId,
  sectionKey,
  type MoveSection,
} from './list-move-model';
import {
  MoveOrder,
  type MoveAnswer,
  type MoveTargets,
} from './list-move-order';
import { moveSection } from './list-move-sections.mocks';

const columns: MoveSection[] = [
  moveSection({
    key: 'a',
    id: 'todo',
    title: 'To do',
    rows: ['login', 'docs'],
  }),
  moveSection({
    key: 'b',
    id: 'doing',
    title: 'In progress',
    rows: ['search'],
  }),
  moveSection({ key: 'c', id: 'done', title: 'Done', rows: [] }),
];

// Each card and the columns it may move to.
const targets: MoveTargets = new Map([
  [rowId('login'), new Set([sectionId('doing')])],
  [rowId('search'), new Set([sectionId('todo'), sectionId('done')])],
]);

function boardOrder(onMove: MoveAnswer): MoveOrder {
  return new MoveOrder(
    { base: columns, onMove, lanes: true, titles: new Map(), targets },
    { report: async (answer) => answer(), frame: (step) => step() },
  );
}

const labelsOf = (order: MoveOrder, id: string): string[] =>
  moveEntries(order, rowId(id)).map((entry) => entry.label);

describe('MoveOrder on a board', () => {
  it('lets a card land only in the columns it names', () => {
    const order = boardOrder(vi.fn());

    expect(order.allows(rowId('login'), sectionKey('b'))).toBe(true);
    expect(order.allows(rowId('login'), sectionKey('c'))).toBe(false);
  });

  it('never lets a card land in the column it is in', () => {
    const order = boardOrder(vi.fn());

    expect(order.allows(rowId('search'), sectionKey('b'))).toBe(false);
  });

  it('lets a card that names no columns land nowhere', () => {
    const order = boardOrder(vi.fn());

    expect(order.allows(rowId('docs'), sectionKey('b'))).toBe(false);
    expect(labelsOf(order, 'docs')).toEqual([]);
  });

  it('draws as unavailable, while a card is dragged, only the lanes it may not land in nor came from', () => {
    const order = boardOrder(vi.fn());

    expect(order.refuses(rowId('login'), sectionKey('c'))).toBe(true);
    expect(order.refuses(rowId('login'), sectionKey('b'))).toBe(false);
    expect(order.refuses(rowId('login'), sectionKey('a'))).toBe(false);
  });

  it("offers a card's menu one move to each column it names, and no steps", () => {
    const order = boardOrder(vi.fn());

    expect(labelsOf(order, 'search')).toEqual([
      'Move to To do',
      'Move to Done',
    ]);
  });

  it('moves a card to the column its menu entry names', () => {
    const onMove = vi.fn<MoveAnswer>();
    const order = boardOrder(onMove);

    moveEntries(order, rowId('search'))
      .find((entry) => entry.label === 'Move to Done')
      ?.choose();

    expect(onMove).toHaveBeenCalledWith({
      id: 'search',
      section: 'done',
      index: 0,
    });
  });

  it('offers the moves of the column a card shows in once it moved', () => {
    const order = boardOrder(vi.fn());

    moveEntries(order, rowId('login'))[0]?.choose();

    expect(order.menuOf(rowId('login'))).not.toBe(
      boardOrder(vi.fn()).menuOf(rowId('login')),
    );
  });
});

describe('MoveOrder on a List', () => {
  it('lets a row land in any Section', () => {
    const order = new MoveOrder(
      { base: columns, onMove: vi.fn(), lanes: false, titles: new Map() },
      { report: async (answer) => answer(), frame: (step) => step() },
    );

    expect(order.allows(rowId('login'), sectionKey('a'))).toBe(true);
    expect(order.allows(rowId('docs'), sectionKey('c'))).toBe(true);
  });
});
