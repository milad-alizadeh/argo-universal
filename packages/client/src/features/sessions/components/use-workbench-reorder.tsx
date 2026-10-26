import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';

// What the column puts on each card's slot to take part in a reorder.
export interface WorkbenchSlot {
  // Names the slot, so the handle can find the column its card is stacked in.
  testID?: string;
  className?: string;
  style?: ViewStyle;
}

export interface WorkbenchReorder<Card extends { id: string }> {
  // The cards in the order they are drawn.
  cards: Card[];
  slot: (id: string) => WorkbenchSlot;
  // The grip a card shows in its actions lane; nothing where the card cannot be moved.
  handle: (id: string, label: string) => ReactNode;
}

// Phones draw no Workbench column, so there is nothing to reorder: the cards keep the order they are given.
export function useWorkbenchReorder<Card extends { id: string }>(
  cards: readonly Card[],
): WorkbenchReorder<Card> {
  return { cards: [...cards], slot: () => ({}), handle: () => null };
}
