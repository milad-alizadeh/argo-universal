import {
  type AddOnlySlotId,
  projectDetailsSlotId,
  sessionActivitySlotId,
  sessionRowSlotId,
} from '@repo/contracts/plugins/wire';
import { sessionRowSlot } from './session-row-slot';
import type { SlotSettings } from './slot-settings';

/*
 * Every Slot in the registry, with its page under Settings › Plugins or null for none: a new Slot does not compile
 * until it says which.
 */
const declared = {
  // Plugin pages, drawn where they are declared; there is nothing to choose.
  [projectDetailsSlotId]: null,
  [sessionRowSlotId]: sessionRowSlot,
  // Chosen on the Session rows page, as its Activity line.
  [sessionActivitySlotId]: null,
} satisfies Record<AddOnlySlotId, SlotSettings | null>;

export const slotSettings: readonly SlotSettings[] = Object.values(
  declared,
).flatMap((settings) => (settings ? [settings] : []));

export const findSlotSettings = (slotId: string): SlotSettings | undefined =>
  slotSettings.find((settings) => settings.slotId === slotId);
