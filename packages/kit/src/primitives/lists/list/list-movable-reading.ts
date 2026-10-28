import {
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  useListReader,
  usePrepared,
  type ListReader,
  type PreparedChildren,
} from './list-children';
import type { ChildrenOptions } from './list-children-options';
import { MoveOrder, shownSections, type MoveAnswer } from './list-move-order';
import { useListRequest } from './list-request';
import { readList, type ListReading } from './list-section-model';

const failure = {
  title: "Couldn't move the row",
  message: 'It went back to where it was.',
};

const nextFrame = (step: () => void): void => {
  requestAnimationFrame(step);
};

// The List's one MoveOrder, which holds nothing until its owner's order reaches it.
function useOwnedOrder(onMove: MoveAnswer): MoveOrder {
  const { report } = useListRequest(failure);
  const owner = { base: [], onMove, lanes: false };

  const [order] = useState(
    () => new MoveOrder(owner, { report, frame: nextFrame }),
  );

  return order;
}

export interface MovableReading {
  prepared: PreparedChildren;
  order: MoveOrder;
}

// The children read in the order the List shows, again as a move is held or let go.
function useShownReading(
  { children }: ChildrenOptions,
  reader: ListReader,
  order: MoveOrder,
): ListReading {
  const held = useSyncExternalStore(order.subscribe, () => order.held);

  return useMemo(
    () => readList(children, reader, (owners) => shownSections(held, owners)),
    [children, reader, held],
  );
}

/*
 * A List with `onMove` reads its children in the order it shows: its owner's, or a held move's while the owner answers.
 * Its owner's order, and what the owner last drew, reach its MoveOrder before the List paints.
 */
export function useMovableReading(
  options: ChildrenOptions,
  onMove: MoveAnswer,
): MovableReading {
  const reader = useListReader(options.children);
  const order = useOwnedOrder(onMove);
  const { blocks, sections: base } = useShownReading(options, reader, order);
  const prepared = usePrepared(options, blocks, reader.prefix);
  const { lanes } = prepared;

  useLayoutEffect(() => order.own({ base, onMove, lanes }));

  return { prepared, order };
}
