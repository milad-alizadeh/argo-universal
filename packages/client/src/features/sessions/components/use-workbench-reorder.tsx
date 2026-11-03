import { type ComponentRef, type ReactNode, type RefObject } from 'react';
import type { View, ViewProps, ViewStyle } from 'react-native';
import type { WorkbenchColumnCard } from './workbench-column';

export interface WorkbenchSlot {
  className?: string;
  style?: ViewStyle;
  // A pointer over the card shows its handle; a touch is not a hover and shows nothing.
  onPointerEnter?: ViewProps['onPointerEnter'];
  onPointerLeave?: ViewProps['onPointerLeave'];
}

// The column the cards are stacked in, which a handle measures as it is taken.
export type ColumnRef = RefObject<ComponentRef<typeof View> | null>;

export interface WorkbenchReorder {
  cards: WorkbenchColumnCard[];
  slot: (id: string) => WorkbenchSlot;
  // The grip a card shows in its actions lane; nothing where the card cannot be moved.
  handle: (id: string, label: string) => ReactNode;
}

// Phones draw no Workbench column, so there is nothing to reorder: the cards keep the order they are given.
export function useWorkbenchReorder(
  cards: readonly WorkbenchColumnCard[],
  _column: ColumnRef,
): WorkbenchReorder {
  return { cards: [...cards], slot: () => ({}), handle: () => null };
}
