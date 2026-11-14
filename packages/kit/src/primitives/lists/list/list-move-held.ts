import { applyListMove } from '@repo/contracts/kit-moves';
import type { MoveSection, RowId, RowMove } from './list-move-model';

// A move the List shows before its owner answers it, and the owner's order it was made on.
export interface HeldMove {
  move: RowMove;
  base: readonly MoveSection[];
}

const sameRows = (a: readonly RowId[], b: readonly RowId[]): boolean =>
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
  held: HeldMove | null,
  base: readonly MoveSection[],
): readonly MoveSection[] {
  if (!held || !sameOrder(held.base, base)) return base;

  return applyListMove(base, held.move);
}
