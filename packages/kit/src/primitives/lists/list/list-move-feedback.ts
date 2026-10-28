import { useCallback, useMemo, useState } from 'react';
import type { ListMove, MoveSection } from './list-move-model';
import { moveNotice, type MoveNotice } from './list-move-notice';

// Focuses a row; with `ifLost`, only while nothing else holds the focus.
export type FocusRow = (ifLost: boolean) => void;

/*
 * The rows of one List that take focus, by id: a row registers as it draws. A row moved to another lane draws anew
 * there, possibly a commit after the frame that focused it where it was, so the moved row's next draw takes back the
 * focus its old copy lost, once.
 */
export class RowFocus {
  private readonly rows = new Map<string, FocusRow>();
  private pending: string | undefined;

  public register(id: string, focus: FocusRow): () => void {
    this.rows.set(id, focus);

    if (this.pending === id) {
      this.pending = undefined;
      requestAnimationFrame(() => focus(true));
    }

    return (): void => {
      if (this.rows.get(id) === focus) this.rows.delete(id);
    };
  }

  // Focuses row `id` a frame after a move, once it has drawn where it landed.
  public after(id: string): void {
    this.pending = id;
    requestAnimationFrame(() => this.rows.get(id)?.(false));
  }
}

function useNotice(): [MoveNotice | null, (text: string) => void] {
  const [notice, setNotice] = useState<MoveNotice | null>(null);

  const tell = useCallback((text: string) => {
    setNotice((last) => ({ text, count: (last?.count ?? 0) + 1 }));
  }, []);

  return [notice, tell];
}

export interface MoveFeedback {
  // Makes a move, then keeps focus on the row and tells where it landed.
  move: (move: ListMove) => void;
  focus: RowFocus;
  notice: MoveNotice | null;
}

type Move = (move: ListMove) => void;

interface Told {
  sections: readonly MoveSection[];
  move: Move;
  focus: RowFocus;
}

function useToldMove(
  { sections, move, focus }: Told,
  tell: (text: string) => void,
): Move {
  return useCallback(
    (next: ListMove) => {
      // Before the move, which may draw at once.
      focus.after(next.id);
      move(next);
      tell(moveNotice(sections, next));
    },
    [move, focus, tell, sections],
  );
}

// After a move, focus stays on the moved row and a screen reader hears where it landed.
export function useMoveFeedback(
  sections: readonly MoveSection[],
  move: Move,
): MoveFeedback {
  const [focus] = useState(() => new RowFocus());
  const [notice, tell] = useNotice();
  const told = useToldMove({ sections, move, focus }, tell);

  return useMemo(() => ({ move: told, focus, notice }), [told, focus, notice]);
}
