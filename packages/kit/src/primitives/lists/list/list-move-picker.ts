import { useMemo } from 'react';
import { useListMoveOrder } from './list-move-context';
import {
  pickSections,
  type PickSection,
  type PickSpot,
} from './list-move-menu';
import { resolveMove } from './list-move-model';
import { useMoveOrder, type MoveOrder } from './list-move-order';

// The Move to… picker open for one row: what it lists, and what picking a place or closing it does.
export interface MovePicker {
  sections: PickSection[];
  choose: (spot: PickSpot) => void;
  close: () => void;
}

// A row without a title is named by its place in its Section, counted from one.
const titled =
  (order: MoveOrder) =>
  (id: string, index: number): string =>
    order.titleOf(id) ?? `row ${index + 1}`;

function pickerOf(order: MoveOrder, id: string): MovePicker {
  const close = (): void => order.closePicker();

  return {
    sections: pickSections(order.sections, id, titled(order)),
    close,
    // Resolved against the order as it is when picked, like every other move.
    choose: ({ place }) => {
      const now = resolveMove(order.sections, id, { kind: 'place', place });

      close();

      if (now) order.move(now);
    },
  };
}

const pickerFor = (
  order: MoveOrder | undefined,
  id: string | undefined,
): MovePicker | undefined =>
  order && id !== undefined ? pickerOf(order, id) : undefined;

// The Move to… picker while it is open for row `id`; nothing otherwise, or outside a List with `onMove`.
export function useMovePicker(id: string | undefined): MovePicker | undefined {
  const order = useListMoveOrder();

  const open = useMoveOrder(
    order,
    (each) => id !== undefined && each.picking === id,
  );

  return useMemo(
    () => (open ? pickerFor(order, id) : undefined),
    [open, order, id],
  );
}
