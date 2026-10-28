import {
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
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
import {
  MoveOrder,
  shownSections,
  type MoveAnswer,
  type MoveOwner,
} from './list-move-order';
import { moveSectionsOf } from './list-move-reading';
import { useListRequest } from './list-request';
import {
  readList,
  type ListBlock,
  type ListReading,
} from './list-section-model';

const failure = {
  title: "Couldn't move the row",
  message: 'It went back to where it was.',
};

const nextFrame = (step: () => void): void => {
  requestAnimationFrame(step);
};

// The List's one MoveOrder; what its owner last drew reaches it before the List paints.
function useOwnedOrder(owner: MoveOwner): MoveOrder {
  const { report } = useListRequest(failure);

  const [order] = useState(
    () => new MoveOrder(owner, { report, frame: nextFrame }),
  );

  return order;
}

export interface MovableReading {
  prepared: PreparedChildren;
  order: MoveOrder;
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
  { reader, base, owners }: OwnerReading,
  shown: readonly MoveSection[],
): ListBlock[] {
  return useMemo(() => {
    if (shown === owners) return base.blocks;

    const order = new Map(shown.map((section) => [section.key, section.rows]));

    return readList(children, { ...reader, held: { order, rows: base.rows } })
      .blocks;
  }, [children, reader, base, owners, shown]);
}

// The order the List shows over its owner's, drawing again as a move is held or let go.
function useShownSections(
  order: MoveOrder,
  owners: readonly MoveSection[],
): readonly MoveSection[] {
  const held = useSyncExternalStore(order.subscribe, () => order.held);

  return useMemo(() => shownSections(held, owners), [held, owners]);
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
  const base = owner.owners;
  const order = useOwnedOrder({ base, onMove, lanes: false });
  const shown = useShownSections(order, base);
  const blocks = useShownBlocks(options.children, owner, shown);
  const prepared = usePrepared(options, blocks, owner.reader.prefix);
  const { lanes } = prepared;

  useLayoutEffect(() => order.own({ base, onMove, lanes }));

  return { prepared, order };
}
