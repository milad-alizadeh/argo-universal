import { cn } from '@repo/kit/utils';
import { useState } from 'react';
import type { ViewStyle } from 'react-native';
import { useReorderGesture, type Gesture } from './use-reorder-gesture.web';
import type {
  ColumnRef,
  WorkbenchReorder,
  WorkbenchSlot,
} from './use-workbench-reorder';
import type { WorkbenchColumnCard } from './workbench-column';
import {
  ReorderHandle,
  type ReorderHandleProps,
} from './workbench-reorder-handle.web';
import {
  clampOffset,
  type Grab,
  makeRoom,
  orderCards,
  type Drag,
} from './workbench-reorder-model';

// Neighbours glide aside while a card is held; the held card follows the pointer with no delay.
function slotStyle(
  id: string,
  index: number,
  drag: Drag | null,
): ViewStyle | undefined {
  if (!drag) return undefined;

  if (drag.id === id)
    return {
      transform: [
        { translateY: clampOffset(drag.slots, drag.from, drag.offset) },
      ],
      zIndex: 1,
    };

  return { transform: [{ translateY: makeRoom(drag, index) }] };
}

const glide = (id: string, drag: Drag | null): string | undefined =>
  drag && drag.id !== id ? 'web:transition-transform web:duration-200' : '';

function slotFor(
  id: string,
  shown: readonly string[],
  gesture: Gesture,
): WorkbenchSlot {
  return {
    className: cn(glide(id, gesture.drag)),
    style: slotStyle(id, shown.indexOf(id), gesture.drag),
  };
}

const gestureProps = (
  id: string,
  gesture: Gesture,
): Omit<ReorderHandleProps, 'label' | 'column'> => ({
  onGrab: (grab: Grab) => gesture.begin(id, grab),
  onMove: gesture.move,
  onRelease: gesture.end,
  onCancel: gesture.cancel,
  onNudge: (by: -1 | 1) => gesture.nudge(id, by),
});

// The cards by id, and the ids in the order drawn: the one the user chose, with any new card after it.
interface OrderedCards {
  byId: Map<string, WorkbenchColumnCard>;
  shown: string[];
  setOrder: (order: string[]) => void;
}

function useOrder(cards: readonly WorkbenchColumnCard[]): OrderedCards {
  const [order, setOrder] = useState<string[]>([]);
  const byId = new Map(cards.map((card) => [card.id, card]));

  return { byId, shown: orderCards([...byId.keys()], order), setOrder };
}

// A lone card has nothing to move past, so it shows no handle.
const handleFor =
  (
    count: number,
    column: ColumnRef,
    gesture: Gesture,
  ): WorkbenchReorder['handle'] =>
  (id, label) =>
    count > 1 ? (
      <ReorderHandle
        label={label}
        column={column}
        {...gestureProps(id, gesture)}
      />
    ) : null;

/*
 * Desktop and web: a card is moved by its handle, with a pointer or the arrow keys. The order is kept here, in the
 * column, for as long as it is drawn; nothing is stored, so a Workbench opens in its default order.
 */
export function useWorkbenchReorder(
  cards: readonly WorkbenchColumnCard[],
  column: ColumnRef,
): WorkbenchReorder {
  const { byId, shown, setOrder } = useOrder(cards);
  const gesture = useReorderGesture({ shown, reorder: setOrder });

  return {
    cards: shown.flatMap((id) => byId.get(id) ?? []),
    slot: (id) => slotFor(id, shown, gesture),
    handle: handleFor(shown.length, column, gesture),
  };
}
