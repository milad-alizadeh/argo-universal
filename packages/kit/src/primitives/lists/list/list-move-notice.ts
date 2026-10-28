import type { ListMove, MoveSection } from './list-move-model';

// What a screen reader hears once a row moves; `count` tells two equal moves apart, so each one is heard.
export interface MoveNotice {
  text: string;
  count: number;
}

// Where the row landed: its Section, by title, and its position there, counted from one.
export function moveNotice(
  sections: readonly MoveSection[],
  move: ListMove,
): string {
  const title = sections.find((section) => section.id === move.section)?.title;
  const position = `position ${move.index + 1}`;

  return title ? `Moved to ${title}, ${position}` : `Moved to ${position}`;
}
