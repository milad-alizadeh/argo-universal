import { cn } from '@repo/kit/utils';
import { useState } from 'react';
import type { PointerEvent, ViewStyle } from 'react-native';
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

// The card under a mouse or pen, whose handle shows; a touch never hovers, so it leaves the handle as it is.
interface Hover {
  id: string | null;
  set: (id: string | null) => void;
}

// What places each card and its handle: the order drawn, the drag under way and the card the pointer is over.
interface Placing {
  shown: readonly string[];
  gesture: Gesture;
  hover: Hover;
}

const pointed = (event: PointerEvent): boolean =>
  event.nativeEvent.pointerType !== 'touch';

function slotFor(
  id: string,
  { shown, gesture, hover }: Placing,
): WorkbenchSlot {
  return {
    className: cn(glide(id, gesture.drag)),
    style: slotStyle(id, shown.indexOf(id), gesture.drag),
    onPointerEnter: (event) => {
      if (pointed(event)) hover.set(id);
    },
    onPointerLeave: () => hover.set(null),
  };
}

const gestureProps = (
  id: string,
  gesture: Gesture,
): Omit<ReorderHandleProps, 'label' | 'column' | 'shown'> => ({
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

// A handle shows on the card under the pointer; while a card is held it is the only one, wherever the pointer has gone.
const handleShown = (id: string, { gesture, hover }: Placing): boolean =>
  gesture.drag ? gesture.drag.id === id : hover.id === id;

// A lone card has nothing to move past, so it shows no handle.
const handleFor =
  (placing: Placing, column: ColumnRef): WorkbenchReorder['handle'] =>
  (id, label) =>
    placing.shown.length > 1 ? (
      <ReorderHandle
        label={label}
        column={column}
        shown={handleShown(id, placing)}
        {...gestureProps(id, placing.gesture)}
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
  const [hovered, setHovered] = useState<string | null>(null);
  const placing = { shown, gesture, hover: { id: hovered, set: setHovered } };

  return {
    cards: shown.flatMap((id) => byId.get(id) ?? []),
    slot: (id) => slotFor(id, placing),
    handle: handleFor(placing, column),
  };
}
