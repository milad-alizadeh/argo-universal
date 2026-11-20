import {
  sessionHeaderSlotId,
  sessionWorkbenchSlotId,
} from '@repo/contracts/plugins/declared-slots';
import {
  linkMarkSlotId,
  projectDetailsSlotId,
  sessionBarSlotId,
  sessionChangesSlotId,
  sessionRowSlotId,
} from '@repo/contracts/plugins/wire';
import { sessionBarSlot } from './session-bar-slot';
import { sessionHeaderSlot } from './session-header-slot';
import { sessionRowSlot } from './session-row-slot';
import { sessionWorkbenchSlot } from './session-workbench-slot';
import type { SlotDetail, SlotDetailId } from './slot-detail';

/*
 * Every Slot in the registry, with its page under Settings › Plugins or null for none: a new Slot does not compile
 * until it says which.
 */
const declared = {
  // Plugin pages, drawn where they are declared; there is nothing to choose.
  [projectDetailsSlotId]: null,
  [sessionRowSlotId]: sessionRowSlot,
  [sessionBarSlotId]: sessionBarSlot,
  // Argo's Changes card and Inspector draw these; there is nothing to choose.
  [sessionChangesSlotId]: null,
  // Argo draws the mark beside the link; there is nothing to choose.
  [linkMarkSlotId]: null,
  [sessionHeaderSlotId]: sessionHeaderSlot,
  [sessionWorkbenchSlotId]: sessionWorkbenchSlot,
} satisfies Record<SlotDetailId, SlotDetail | null>;

export const slotDetails: readonly SlotDetail[] = Object.values(
  declared,
).flatMap((settings) => (settings ? [settings] : []));

export const findSlotDetail = (slotId: string): SlotDetail | undefined =>
  slotDetails.find((settings) => settings.slotId === slotId);
