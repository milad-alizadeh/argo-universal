import { useCallback, useMemo, useState } from 'react';
import type { ListMove } from './list-move-model';
import { moveNotice, type MoveNotice } from './list-move-notice';
import type { ShownMoves } from './list-shown-moves';

// The rows of one List that take focus, by id: a row registers as it draws.
export class RowFocus {
  private readonly rows = new Map<string, () => void>();

  register(id: string, focus: () => void): () => void {
    this.rows.set(id, focus);

    return (): void => {
      if (this.rows.get(id) === focus) this.rows.delete(id);
    };
  }

  // Focuses row `id` a frame after a move, once it has drawn where it landed.
  after(id: string): void {
    requestAnimationFrame(() => this.rows.get(id)?.());
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
  shown: ShownMoves;
  focus: RowFocus;
  notice: MoveNotice | null;
}

function useToldMove(
  { sections, move }: ShownMoves,
  focus: RowFocus,
  tell: (text: string) => void,
): (move: ListMove) => void {
  return useCallback(
    (next: ListMove) => {
      move(next);
      focus.after(next.id);
      tell(moveNotice(sections, next));
    },
    [move, focus, tell, sections],
  );
}

// After a move, focus stays on the moved row and a screen reader hears where it landed.
export function useMoveFeedback(shown: ShownMoves): MoveFeedback {
  const [focus] = useState(() => new RowFocus());
  const [notice, tell] = useNotice();
  const told = useToldMove(shown, focus, tell);

  return useMemo(
    () => ({ shown: { ...shown, move: told }, focus, notice }),
    [shown, told, focus, notice],
  );
}
