export interface CardSlot {
  top: number;
  height: number;
}

export interface Grab {
  pointerY: number;
  slots: readonly CardSlot[];
}

export interface Drag {
  id: string;
  from: number;
  slots: readonly CardSlot[];
  // How far the pointer has travelled since the handle was taken.
  offset: number;
}

// The stored order first, for the cards still offered; a card the order has not met yet follows, in the order offered.
export function orderCards(
  ids: readonly string[],
  order: readonly string[],
): string[] {
  const stored = order.filter((id) => ids.includes(id));

  return [...stored, ...ids.filter((id) => !stored.includes(id))];
}

export function moveCard(
  ids: readonly string[],
  from: number,
  to: number,
): string[] {
  const moved = [...ids];
  const [card] = moved.splice(from, 1);

  if (card !== undefined) moved.splice(to, 0, card);

  return moved;
}

export const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

const none: CardSlot = { top: 0, height: 0 };

const slotAt = (slots: readonly CardSlot[], index: number): CardSlot =>
  slots[index] ?? none;

const middle = ({ top, height }: CardSlot): number => top + height / 2;

// How far the held card is drawn from its place: the pointer may travel further, but the card stays inside the column, between the first card's top and the last card's bottom.
export function clampOffset(
  slots: readonly CardSlot[],
  from: number,
  offset: number,
): number {
  const held = slotAt(slots, from);
  const first = slotAt(slots, 0);
  const last = slotAt(slots, slots.length - 1);

  const lowest = first.top - held.top;
  const highest = last.top + last.height - (held.top + held.height);

  return clamp(offset, lowest, highest);
}

export function dropIndex(drag: Drag): number {
  const centre = middle(slotAt(drag.slots, drag.from)) + drag.offset;

  return drag.slots.filter(
    (slot, index) => index !== drag.from && middle(slot) < centre,
  ).length;
}

function gapBetween(slots: readonly CardSlot[]): number {
  const [first, second] = slots;

  return first && second ? second.top - (first.top + first.height) : 0;
}

const within = (index: number, low: number, high: number): boolean =>
  index >= low && index <= high;

function stepDirection(from: number, target: number, index: number): number {
  if (within(index, from + 1, target)) return -1;

  return within(index, target, from - 1) ? 1 : 0;
}

export function makeRoom(drag: Drag, index: number): number {
  const step = slotAt(drag.slots, drag.from).height + gapBetween(drag.slots);

  return stepDirection(drag.from, dropIndex(drag), index) * step;
}
