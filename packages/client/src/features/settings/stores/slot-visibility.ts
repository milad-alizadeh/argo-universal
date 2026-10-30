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

export const useSlotVisibility = (slotId: string): SlotVisibility =>
  slotVisibility(useSlotChoices(slotId));
