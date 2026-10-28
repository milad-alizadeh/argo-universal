import type { ListMove } from '@repo/contracts/kit-moves';
import { useCallback, useMemo, useState } from 'react';
import type { MoveSection } from './list-move-model';
import type { MoveOrder } from './list-move-order';

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
  order: Pick<MoveOrder, 'sections'>;
  move: Move;
  focus: RowFocus;
}

// Reads the order as the move is made, so the move stays one function while the order changes.
function useToldMove(
  { order, move, focus }: Told,
  tell: (text: string) => void,
): Move {
  return useCallback(
    (next: ListMove) => {
      const notice = moveNotice(order.sections, next);

      // Before the move, which may draw at once.
      focus.after(next.id);
      move(next);
      tell(notice);
    },
    [move, focus, tell, order],
  );
}

// After a move, focus stays on the moved row and a screen reader hears where it landed.
export function useMoveFeedback(
  order: Pick<MoveOrder, 'sections'>,
  move: Move,
): MoveFeedback {
  const [focus] = useState(() => new RowFocus());
  const [notice, tell] = useNotice();
  const told = useToldMove({ order, move, focus }, tell);

  return useMemo(() => ({ move: told, focus, notice }), [told, focus, notice]);
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
