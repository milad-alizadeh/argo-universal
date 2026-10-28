import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  movedSections,
  type ListMove,
  type MoveSection,
} from './list-move-model';
import { moveSections, reorderedChildren } from './list-move-sections';

// A Plugin's `onMove` answers once its dispatch settles; an App owner's answers at once.
export type MoveAnswer = (move: ListMove) => void | Promise<void>;

interface PendingMove {
  move: ListMove;
  // The order the move was made on; once the owner draws another, its answer stands instead.
  order: string;
}

// A frame after the owner answers a move, so the order it answered with has drawn by then.
function afterAnswer(answer: void | Promise<void>, settle: () => void): void {
  const later = (): void => {
    requestAnimationFrame(settle);
  };

  void Promise.resolve(answer).then(later, later);
}

// Clears the pending move once it is answered, unless a later move has replaced it.
const withoutAnswered =
  (answered: ListMove) =>
  (current: PendingMove | null): PendingMove | null =>
    current?.move === answered ? null : current;

function usePendingMove(
  order: string,
  onMove: MoveAnswer,
): [ListMove | undefined, (move: ListMove) => void] {
  const [pending, setPending] = useState<PendingMove | null>(null);

  const move = useCallback(
    (next: ListMove) => {
      setPending({ move: next, order });
      afterAnswer(onMove(next), () => setPending(withoutAnswered(next)));
    },
    [onMove, order],
  );

  return [pending?.order === order ? pending.move : undefined, move];
}

type Order = Pick<ShownMoves, 'sections' | 'children'>;

function heldOrder(
  sections: readonly MoveSection[],
  children: ReactNode,
  held: ListMove | undefined,
): Order {
  if (!held) return { sections, children };

  const moved = movedSections(sections, held);

  return { sections: moved, children: reorderedChildren(children, moved) };
}

export interface ShownMoves {
  sections: readonly MoveSection[];
  children: ReactNode;
  move: (move: ListMove) => void;
}

/*
 * A move shows at once: the List draws its rows in the moved order until its owner draws a new order, or answers
 * without one, a frame after its `onMove` settles.
 */
export function useShownMoves(
  children: ReactNode,
  onMove: MoveAnswer,
): ShownMoves {
  const sections = useMemo(() => moveSections(children), [children]);
  const [held, move] = usePendingMove(JSON.stringify(sections), onMove);

  return useMemo(
    () => ({ ...heldOrder(sections, children, held), move }),
    [held, sections, children, move],
  );
}
