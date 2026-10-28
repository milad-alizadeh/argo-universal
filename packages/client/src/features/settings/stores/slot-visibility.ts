import { type SlotChoices, useSlotChoices } from './slot-choices';

/*
 * What a Slot shows on this Device: the Plugins left on, and the Plugin that writes its Single-owner Slot. A Plugin
 * turned off gives that line back to Argo, so a hidden Plugin never writes it.
 */
export interface SlotVisibility {
  shows: (pluginId: string) => boolean;
  owner: string | null;
}

export function slotVisibility({ hidden, owner }: SlotChoices): SlotVisibility {
  const shows = (pluginId: string): boolean => !hidden.includes(pluginId);

  return { shows, owner: owner !== null && shows(owner) ? owner : null };
}

type Attributed<Item> = { pluginId: string; item: Item };

// A context's merged items as the Server sends them: what fits, then the rest.
export type Merged<Item> = {
  items: readonly Attributed<Item>[];
  overflow: readonly Attributed<Item>[];
};

// The items of the Plugins left on; one hidden makes room for the next in line, up to what the Server let fit.
export const visibleItems = <Item>(
  { items, overflow }: Merged<Item>,
  visibility: SlotVisibility,
): Item[] =>
  [...items, ...overflow]
    .filter(({ pluginId }) => visibility.shows(pluginId))
    .slice(0, items.length)
    .map(({ item }) => item);

// The owner's answer in a Single-owner Slot; none while the line is Argo's or the owner has no answer.
export const ownerItem = <Item>(
  { items, overflow }: Merged<Item>,
  visibility: SlotVisibility,
): Item | undefined =>
  [...items, ...overflow].find(({ pluginId }) => pluginId === visibility.owner)
    ?.item;

export const useSlotVisibility = (slotId: string): SlotVisibility =>
  slotVisibility(useSlotChoices(slotId));
