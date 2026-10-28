import type { ListMove } from '@repo/contracts/kit-moves';
import { describe, expect, it } from 'vitest';
import type { MoveSection } from './list-move-model';
import { settled, shownSections, type HeldMove } from './list-shown-order';

const board: MoveSection[] = [
  { key: 'a', id: 'todo', rows: ['login', 'docs'] },
  { key: 'b', id: 'done', rows: [] },
];

const toDone: ListMove = { id: 'login', section: 'done', index: 0 };

const heldToDone: HeldMove = { move: toDone, base: board };

const rowsOf = (sections?: readonly MoveSection[]): string[][] | undefined =>
  sections?.map((section) => [...section.rows]);

describe('the order a List shows while its owner answers a move', () => {
  it('holds a move on the order it was made on', () => {
    expect(rowsOf(shownSections(heldToDone, board))).toEqual([
      ['docs'],
      ['login'],
    ]);
  });

  it('holds it on a redraw of the same order, as an owner that answers later redraws', () => {
    const redrawn = board.map((section) => ({ ...section }));

    expect(rowsOf(shownSections(heldToDone, redrawn))).toEqual([
      ['docs'],
      ['login'],
    ]);
  });

  it('shows the owner’s order once it draws another', () => {
    const answered: MoveSection[] = [
      { key: 'a', id: 'todo', rows: ['docs'] },
      { key: 'b', id: 'done', rows: ['login'] },
    ];

    expect(shownSections(heldToDone, answered)).toBeUndefined();
  });

  it('lets go of a move once it settles, whether the owner took or refused it', () => {
    expect(settled(toDone)(heldToDone)).toBeNull();
  });

  it('keeps a later move when an earlier one settles', () => {
    const later: ListMove = { id: 'docs', section: 'done', index: 0 };
    const current = { move: later, base: board };

    expect(settled(toDone)(current)).toBe(current);
  });
});
