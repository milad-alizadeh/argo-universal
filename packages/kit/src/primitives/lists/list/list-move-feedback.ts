import { useCallback, useMemo, useState } from 'react';
import type { ListMove, MoveSection } from './list-move-model';
import { moveNotice, type MoveNotice } from './list-move-notice';

// The rows of one List that take focus, by id: a row registers as it draws.
export class RowFocus {
  private readonly rows = new Map<string, () => void>();

  public register(id: string, focus: () => void): () => void {
    this.rows.set(id, focus);

    return (): void => {
      if (this.rows.get(id) === focus) this.rows.delete(id);
    };
  }

  // Focuses row `id` a frame after a move, once it has drawn where it landed.
  public after(id: string): void {
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
      move(next);
      focus.after(next.id);
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
