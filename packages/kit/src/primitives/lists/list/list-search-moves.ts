import type { ListMove } from '@repo/contracts/kit-moves';
import type { MoveSection } from './list-move-model';

// The rows of the move's Section, without the moved row.
const othersIn = (
  sections: readonly MoveSection[],
  { id, section }: ListMove,
): readonly string[] =>
  sections
    .find((each) => each.id === section)
    ?.rows.filter((row) => row !== id) ?? [];

/*
 * A move made among the rows a search shows, counted in the owner's full order: before the same row it lands before
 * there, or at the true end of its Section when it lands after every row shown.
 */
export function unfilteredMove(
  full: readonly MoveSection[],
  shown: readonly MoveSection[],
  move: ListMove,
): ListMove {
  const before = othersIn(shown, move)[move.index];
  const rows = othersIn(full, move);
  const index = before === undefined ? rows.length : rows.indexOf(before);

  return { ...move, index };
}
