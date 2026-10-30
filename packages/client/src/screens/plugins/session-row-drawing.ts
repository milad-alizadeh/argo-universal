import {
  sessionActivitySlotId,
  sessionRowSlotId,
} from '@repo/contracts/plugins/wire';
import type { SessionRowPlugins } from '#features/sessions';
import {
  type SlotChoices,
  slotVisibility,
  type SlotVisibility,
} from '#features/settings';
import type { DrawFromSent } from './session-row-cache';
import { sessionRowPlugins } from './session-row-plugins';
import { itemsSlotEntry, type PluginLookup, readSlotItems } from './slot-items';

const rowSlot = itemsSlotEntry(sessionRowSlotId);

const activitySlot = itemsSlotEntry(sessionActivitySlotId);

/*
 * What a row draws from the two Session row Slots as the Server sent them, through the one Slot reader. Both Slots
 * follow the Session rows page's choices, so turning a Plugin off there takes its items and its Activity line at once.
 */
export function rowDrawing(
  visibility: SlotVisibility,
  lookup: PluginLookup,
): DrawFromSent<SessionRowPlugins> {
  const reader = { visibility, lookup };

  return (items, lines) =>
    sessionRowPlugins(
      readSlotItems(rowSlot, items, reader),
      readSlotItems(activitySlot, lines, reader),
    );
}

// How every row draws under this Device's choices and the Plugins' names.
export const sentDrawing = (
  choices: SlotChoices,
  lookup: PluginLookup,
): DrawFromSent<SessionRowPlugins> =>
  rowDrawing(slotVisibility(choices), lookup);
