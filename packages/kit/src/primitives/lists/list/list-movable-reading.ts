import type { ListMove } from '@repo/contracts/kit-moves';
import { useMemo, type ReactNode } from 'react';
import {
  useListReader,
  usePrepared,
  type ListReader,
  type PreparedChildren,
} from './list-children';
import type { ChildrenOptions } from './list-children-options';
import type { MoveSection } from './list-move-model';
import { heldOrder, moveSectionsOf } from './list-move-reading';
import {
  readList,
  type ListBlock,
  type ListReading,
} from './list-section-model';
import type { MoveAnswer } from './list-shown-order';
import { useShownOrder } from './list-shown-order-hook';

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

    return readList(children, { ...reader, held: heldOrder(shown, base.rows) })
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
