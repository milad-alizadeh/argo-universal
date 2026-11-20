import { DeclaredSlotId } from '@repo/contracts/plugins/declared-slots';
import type { PluginEntry } from '#features/plugins';
import type { SlotDetail, SlotDetailId } from './slot-detail';
import type { SlotPlugin } from './slot-detail-model';

type Contributes = PluginEntry['manifest']['contributes'];

// A Plugin that is on and declares the Slot: the Server asks it for the Slot's content, or lists its manifest's items.
const declares = (
  { enabled, manifest }: PluginEntry,
  slotId: SlotDetailId,
): boolean => enabled && lists(manifest.contributes, slotId);

const isDeclared = (slotId: SlotDetailId): slotId is DeclaredSlotId =>
  DeclaredSlotId.safeParse(slotId).success;

const declaredItems = (
  declared: Contributes['declared'],
  slotId: DeclaredSlotId,
): readonly unknown[] => declared?.[slotId] ?? [];

const lists = (contributes: Contributes, slotId: SlotDetailId): boolean =>
  isDeclared(slotId)
    ? declaredItems(contributes.declared, slotId).length > 0
    : (contributes.slots ?? []).includes(slotId);

// The Plugins that fill the Slot, each with its switch from what this Device shows.
export function toSlotPlugins(
  { slotId }: Pick<SlotDetail, 'slotId'>,
  entries: readonly PluginEntry[],
  shows: (pluginId: string) => boolean,
): SlotPlugin[] {
  return entries.flatMap((entry) =>
    declares(entry, slotId) ? [toPlugin(entry, shows)] : [],
  );
}

const toPlugin = (
  entry: PluginEntry,
  shows: (pluginId: string) => boolean,
): SlotPlugin => ({
  pluginId: entry.manifest.id,
  name: entry.manifest.name,
  shown: shows(entry.manifest.id),
});
