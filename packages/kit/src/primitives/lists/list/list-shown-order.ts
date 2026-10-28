import { applyListMove, type ListMove } from '@repo/contracts/kit-moves';
import { type MoveSection } from './list-move-model';

// A Plugin's `onMove` answers once its dispatch settles; an App owner's answers at once.
export type MoveAnswer = (move: ListMove) => void | Promise<void>;

// A move the List shows before its owner answers it, and the owner's order it was made on.
export interface HeldMove {
  move: ListMove;
  base: readonly MoveSection[];
}

export const held = (
  move: ListMove,
  base: readonly MoveSection[],
): HeldMove => ({
  move,
  base,
});

const sameRows = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((id, index) => id === b[index]);

const sameSection = (a: MoveSection, b: MoveSection | undefined): boolean =>
  b !== undefined && a.key === b.key && sameRows(a.rows, b.rows);

// The owner has not drawn another order: the same Sections, holding the same rows in the same order.
const sameOrder = (
  a: readonly MoveSection[],
  b: readonly MoveSection[],
): boolean =>
  a.length === b.length &&
  a.every((section, index) => sameSection(section, b[index]));

// The order the List shows over its owner's: the held move's, until the owner draws another order.
export function shownSections(
  move: HeldMove | null,
  base: readonly MoveSection[],
): MoveSection[] | undefined {
  if (!move || !sameOrder(move.base, base)) return undefined;

  return applyListMove(base, move.move);
}

// Lets go of a move once its answer settles, unless a later move has replaced it.
export const settled =
  (answered: ListMove) =>
  (current: HeldMove | null): HeldMove | null =>
    current?.move === answered ? null : current;
