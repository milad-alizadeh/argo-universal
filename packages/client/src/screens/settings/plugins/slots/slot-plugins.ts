import type { AddOnlySlotId } from '@repo/contracts/plugins/wire';
import {
  type SlotChoices,
  slotVisibility,
  useSlotChoices,
} from '#features/settings';
import { type PluginEntry, usePluginEntries } from '../use-plugins';
import type { SlotSettings } from './slot-settings';
import type { SlotPlugin } from './slot-settings-model';

export type SlotPluginsLoad =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; plugins: SlotPlugin[] };

// A Plugin that is on and declares the Slot: the Server asks it for the Slot's content.
const declares = (
  { enabled, manifest }: PluginEntry,
  slotId: AddOnlySlotId | undefined,
): boolean => enabled && lists(manifest.contributes.slots, slotId);

const lists = (
  slots: readonly string[] | undefined,
  slotId: AddOnlySlotId | undefined,
): boolean => slotId !== undefined && (slots ?? []).includes(slotId);

// The Plugins that fill the Slot, each with its switch from what this Device hid, and whether it asks for the owner Slot.
export function toSlotPlugins(
  settings: Pick<SlotSettings, 'slotId' | 'ownerSlot'>,
  entries: readonly PluginEntry[],
  choices: SlotChoices,
): SlotPlugin[] {
  const { shows } = slotVisibility(choices);

  return entries.flatMap((entry) =>
    declares(entry, settings.slotId)
      ? [toPlugin(entry, shows, settings.ownerSlot?.slotId)]
      : [],
  );
}

const toPlugin = (
  entry: PluginEntry,
  shows: (pluginId: string) => boolean,
  ownerSlotId: AddOnlySlotId | undefined,
): SlotPlugin => ({
  pluginId: entry.manifest.id,
  name: entry.manifest.name,
  shown: shows(entry.manifest.id),
  asks: declares(entry, ownerSlotId),
});

// The Server's Plugins that fill the Slot, each with this Device's switch, once the Server has answered.
export function useSlotPlugins(settings: SlotSettings): SlotPluginsLoad {
  const { plugins, isError } = usePluginEntries();
  const choices = useSlotChoices(settings.slotId);

  if (!plugins) return { status: isError ? 'error' : 'loading' };

  return {
    status: 'loaded',
    plugins: toSlotPlugins(settings, plugins, choices),
  };
}
