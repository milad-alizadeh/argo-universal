import { useCallback, useMemo, useState } from 'react';
import type { ListMove, MoveSection } from './list-move-model';
import { useListRequest } from './list-request';
import {
  held,
  settled,
  shownSections,
  type HeldMove,
  type MoveAnswer,
} from './list-shown-order';

const failure = {
  title: "Couldn't move the row",
  message: 'It went back to where it was.',
};

export interface ShownOrder {
  // The moved order the List shows; none while it shows its owner's.
  sections: MoveSection[] | undefined;
  move: (move: ListMove) => void;
}

// Holds each move in the shown order, then asks the owner; a refusal shows one error toast.
function useHeldMove(
  base: readonly MoveSection[],
  onMove: MoveAnswer,
  setCurrent: SetHeld,
): ShownOrder['move'] {
  const { report } = useListRequest(failure);

  return useCallback(
    (next: ListMove) => {
      setCurrent(() => held(next, base));
      void report(() => onMove(next)).then(letGo(setCurrent, next));
    },
    [base, onMove, report, setCurrent],
  );
}

/*
 * A move shows at once: the List draws its rows in the moved order until its owner draws another order, or a frame
 * after its `onMove` settles. A refused move goes back, and the List reports it with one error toast (ADR-0031).
 */
export function useShownOrder(
  base: readonly MoveSection[],
  onMove: MoveAnswer,
): ShownOrder {
  const [current, setCurrent] = useState<HeldMove | null>(null);
  const move = useHeldMove(base, onMove, setCurrent);
  const sections = useMemo(() => shownSections(current, base), [current, base]);

  return { sections, move };
}

type SetHeld = (update: (current: HeldMove | null) => HeldMove | null) => void;

// A frame after the answer, so the owner's redraw lands before the held order goes.
const letGo = (setCurrent: SetHeld, answered: ListMove) => (): void => {
  requestAnimationFrame(() => setCurrent(settled(answered)));
};
