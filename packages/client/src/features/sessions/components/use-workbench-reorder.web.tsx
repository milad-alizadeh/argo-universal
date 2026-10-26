import { cn } from '@repo/kit/utils';
import { useState, type ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { useReorderGesture, type Gesture } from './use-reorder-gesture.web';
import type { WorkbenchReorder, WorkbenchSlot } from './use-workbench-reorder';
import { ReorderHandle, slotTestID } from './workbench-reorder-handle.web';
import {
  heldOffset,
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
    return { transform: [{ translateY: heldOffset(drag) }], zIndex: 1 };

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
    testID: slotTestID(id),
    className: cn(glide(id, gesture.drag)),
    style: slotStyle(id, shown.indexOf(id), gesture.drag),
  };
}

function handleFor(id: string, label: string, gesture: Gesture): ReactNode {
  return (
    <ReorderHandle
      label={label}
      onGrab={(grab) => gesture.begin(id, grab)}
      onMove={gesture.move}
      onRelease={gesture.end}
      onCancel={gesture.cancel}
      onNudge={(by) => gesture.nudge(id, by)}
    />
  );
}

// The cards by id, and the ids in the order drawn: the one the user chose, with any new card after it.
interface Order<Card> {
  byId: Map<string, Card>;
  shown: string[];
  setOrder: (order: string[]) => void;
}

function useOrder<Card extends { id: string }>(
  cards: readonly Card[],
): Order<Card> {
  const [order, setOrder] = useState<string[]>([]);
  const byId = new Map(cards.map((card) => [card.id, card]));

  return { byId, shown: orderCards([...byId.keys()], order), setOrder };
}

/*
 * Desktop and web: a card is moved by its handle, with a pointer or the arrow keys. The order is kept here, in the
 * column, for as long as it is drawn; nothing is stored, so a Workbench opens in its default order.
 */
export function useWorkbenchReorder<Card extends { id: string }>(
  cards: readonly Card[],
): WorkbenchReorder<Card> {
  const { byId, shown, setOrder } = useOrder(cards);
  const gesture = useReorderGesture({ shown, reorder: setOrder });

  return {
    cards: shown.flatMap((id) => byId.get(id) ?? []),
    slot: (id) => slotFor(id, shown, gesture),
    handle: (id, label) =>
      shown.length > 1 ? handleFor(id, label, gesture) : null,
  };
}
