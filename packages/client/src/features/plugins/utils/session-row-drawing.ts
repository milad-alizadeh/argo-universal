import { sessionRowSlotId } from '@repo/contracts/plugins/wire';
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

// What a row draws from the Session row Slot as the Server sent it, through the one Slot reader.
export function rowDrawing(
  visibility: SlotVisibility,
  lookup: PluginLookup,
): DrawFromSent<SessionRowPlugins> {
  const reader = { visibility, lookup };

  return (items) => sessionRowPlugins(readSlotItems(rowSlot, items, reader));
}

// How every row draws under this Device's choices and the Plugins' names.
export const sentDrawing = (
  choices: SlotChoices,
  lookup: PluginLookup,
): DrawFromSent<SessionRowPlugins> =>
  rowDrawing(slotVisibility(choices), lookup);
