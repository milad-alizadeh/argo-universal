import type { AddOnlySlotId } from '@repo/contracts/plugins/wire';
import type { PluginEntry } from '../../use-plugins';
import type { SlotDetail } from './slot-detail';
import type { SlotPlugin } from './slot-detail-model';

// A Plugin that is on and declares the Slot: the Server asks it for the Slot's content.
const declares = (
  { enabled, manifest }: PluginEntry,
  slotId: AddOnlySlotId | undefined,
): boolean => enabled && lists(manifest.contributes.slots, slotId);

const lists = (
  slots: readonly string[] | undefined,
  slotId: AddOnlySlotId | undefined,
): boolean => slotId !== undefined && (slots ?? []).includes(slotId);

// The Plugins that fill the Slot or ask for its owner Slot, each with its switch from what this Device shows.
export function toSlotPlugins(
  settings: Pick<SlotDetail, 'slotId' | 'ownerSlot'>,
  entries: readonly PluginEntry[],
  shows: (pluginId: string) => boolean,
): SlotPlugin[] {
  return entries.flatMap((entry) =>
    belongsOnPage(entry, settings) ? [toPlugin(entry, shows, settings)] : [],
  );
}

// A Plugin is on the page when it fills the Slot or asks for its owner Slot.
const belongsOnPage = (
  entry: PluginEntry,
  { slotId, ownerSlot }: Pick<SlotDetail, 'slotId' | 'ownerSlot'>,
): boolean => declares(entry, slotId) || declares(entry, ownerSlot?.slotId);

const toPlugin = (
  entry: PluginEntry,
  shows: (pluginId: string) => boolean,
  { slotId, ownerSlot }: Pick<SlotDetail, 'slotId' | 'ownerSlot'>,
): SlotPlugin => ({
  pluginId: entry.manifest.id,
  name: entry.manifest.name,
  fills: declares(entry, slotId),
  shown: shows(entry.manifest.id),
  asks: declares(entry, ownerSlot?.slotId),
});
