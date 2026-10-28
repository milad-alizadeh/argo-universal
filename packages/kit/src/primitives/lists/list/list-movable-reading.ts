import type { ListMove } from '@repo/contracts/kit-moves';
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  useListReader,
  usePrepared,
  type ListReader,
  type PreparedChildren,
} from './list-children';
import type { ChildrenOptions } from './list-children-options';
import type { MoveSection } from './list-move-model';
import { moveSectionsOf } from './list-move-reading';
import { useListRequest } from './list-request';
import {
  readList,
  type ListBlock,
  type ListReading,
} from './list-section-model';
import {
  settled,
  shownSections,
  type HeldMove,
  type MoveAnswer,
} from './list-shown-order';

const failure = {
  title: "Couldn't move the row",
  message: 'It went back to where it was.',
};

interface ShownOrder {
  // The moved order the List shows; none while it shows its owner's.
  sections: MoveSection[] | undefined;
  move: (move: ListMove) => void;
}

interface Owner {
  base: readonly MoveSection[];
  onMove: MoveAnswer;
}

/*
 * Holds each move in the shown order, then asks the owner; a refusal shows one error toast. It reads the owner's order
 * and answer as last drawn, so a move stays one function while they change.
 */
function useHeldMove(owner: Owner, setCurrent: SetHeld): ShownOrder['move'] {
  const { report } = useListRequest(failure);
  const latest = useRef(owner);

  useLayoutEffect(() => {
    latest.current = owner;
  });

  return useCallback(
    (next: ListMove) => {
      const { base, onMove } = latest.current;

      setCurrent(() => ({ move: next, base }));
      void report(() => onMove(next)).then(letGo(setCurrent, next));
    },
    [latest, report, setCurrent],
  );
}

/*
 * A move shows at once: the List draws its rows in the moved order until its owner draws another order, or a frame
 * after its `onMove` settles. A refused move goes back, and the List reports it with one error toast (ADR-0031).
 */
function useShownOrder(
  base: readonly MoveSection[],
  onMove: MoveAnswer,
): ShownOrder {
  const [current, setCurrent] = useState<HeldMove | null>(null);
  const move = useHeldMove({ base, onMove }, setCurrent);
  const sections = useMemo(() => shownSections(current, base), [current, base]);

  return { sections, move };
}

type SetHeld = (update: (current: HeldMove | null) => HeldMove | null) => void;

// A frame after the answer, so the owner's redraw lands before the held order goes.
const letGo = (setCurrent: SetHeld, answered: ListMove) => (): void => {
  requestAnimationFrame(() => setCurrent(settled(answered)));
};

export interface MovableReading {
  prepared: PreparedChildren;
  // The movable rows, Section by Section, in the order they show.
  sections: readonly MoveSection[];
  move: (move: ListMove) => void;
}

interface OwnerReading {
  reader: ListReader;
  // The List's blocks in its owner's order.
  base: ListReading;
  // The movable rows in its owner's order.
  owners: MoveSection[];
}

function useOwnerReading(children: ReactNode): OwnerReading {
  const reader = useListReader(children);

  const base = useMemo(
    () => readList(children, { ...reader, held: undefined }),
    [children, reader],
  );

  const owners = useMemo(
    () => moveSectionsOf(base.blocks, reader.prefix),
    [base, reader.prefix],
  );

  return { reader, base, owners };
}

// The blocks as they show: the owner's, or read again in the moved order while a move waits.
function useShownBlocks(
  children: ReactNode,
  { reader, base }: OwnerReading,
  shown: MoveSection[] | undefined,
): ListBlock[] {
  return useMemo(() => {
    if (!shown) return base.blocks;

    const order = new Map(shown.map((section) => [section.key, section.rows]));

    return readList(children, { ...reader, held: { order, rows: base.rows } })
      .blocks;
  }, [children, reader, base, shown]);
}

/*
 * A List with `onMove` reads its children once for its owner's order, and its movable Sections from that reading.
 * While a move waits for its owner's answer, it reads them again in the moved order.
 */
export function useMovableReading(
  options: ChildrenOptions,
  onMove: MoveAnswer,
): MovableReading {
  const owner = useOwnerReading(options.children);
  const shown = useShownOrder(owner.owners, onMove);
  const blocks = useShownBlocks(options.children, owner, shown.sections);
  const prepared = usePrepared(options, blocks, owner.reader.prefix);

  return {
    prepared,
    sections: shown.sections ?? owner.owners,
    move: shown.move,
  };
}
