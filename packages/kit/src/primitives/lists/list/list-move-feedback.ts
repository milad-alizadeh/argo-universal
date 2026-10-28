import type { ListMove } from '@repo/contracts/kit-moves';
import type { MoveSection } from './list-move-model';

// Focuses a row; with `ifLost`, only while nothing else holds the focus.
export type FocusRow = (ifLost: boolean) => void;

type Frame = (step: () => void) => void;

const nextFrame: Frame = (step) => requestAnimationFrame(step);

/*
 * The rows of one List that take focus, by id: a row registers as it draws. A row moved to another lane draws anew
 * there, possibly a commit after the frame that focused it where it was, so the moved row's next draw takes back the
 * focus its old copy lost, once.
 */
export class RowFocus {
  private readonly rows = new Map<string, FocusRow>();
  private pending: string | undefined;

  public constructor(private readonly frame: Frame = nextFrame) {}

  public register(id: string, focus: FocusRow): () => void {
    this.rows.set(id, focus);

    if (this.pending === id) {
      this.pending = undefined;
      this.frame(() => focus(true));
    }

    return (): void => {
      if (this.rows.get(id) === focus) this.rows.delete(id);
    };
  }

  // Focuses row `id` a frame after a move, once it has drawn where it landed.
  public after(id: string): void {
    this.pending = id;
    this.frame(() => this.rows.get(id)?.(false));
  }
}

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
