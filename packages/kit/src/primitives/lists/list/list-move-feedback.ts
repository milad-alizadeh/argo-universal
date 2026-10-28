import type { RowId } from './list-move-model';
import { nextFrame } from './list-next-frame';
import { registered } from './list-registered';

// Focuses a row; with `ifLost`, only while nothing else holds the focus.
export type FocusRow = (ifLost: boolean) => void;

type Frame = (step: () => void) => void;

/*
 * The rows of one List that take focus, by id: a row registers as it draws. A row moved to another lane draws anew
 * there, possibly a commit after the frame that focused it where it was, so the moved row's next draw takes back the
 * focus its old copy lost, once.
 */
export class RowFocus {
  private readonly rows = new Map<RowId, FocusRow>();
  private pending: RowId | undefined;

  public constructor(private readonly frame: Frame = nextFrame) {}

  public register(id: RowId, focus: FocusRow): () => void {
    if (this.pending === id) {
      this.pending = undefined;
      this.frame(() => focus(true));
    }

    return registered(this.rows, id, focus);
  }

  // Focuses row `id` a frame after a move, once it has drawn where it landed.
  public after(id: RowId): void {
    this.pending = id;
    this.frame(() => this.rows.get(id)?.(false));
  }
}

// What a screen reader hears once a row moves; `count` tells two equal moves apart, so each one is heard.
export interface MoveNotice {
  text: string;
  count: number;
}
