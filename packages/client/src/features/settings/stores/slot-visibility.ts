import { type SlotChoices, useSlotChoices } from './slot-choices';

// What a Slot shows on this Device: the Plugins left on.
export interface SlotVisibility {
  shows: (pluginId: string) => boolean;
}

export function slotVisibility({ hidden }: SlotChoices): SlotVisibility {
  return { shows: (pluginId) => !hidden.includes(pluginId) };
}

export const useSlotVisibility = (slotId: string): SlotVisibility =>
  slotVisibility(useSlotChoices(slotId));
