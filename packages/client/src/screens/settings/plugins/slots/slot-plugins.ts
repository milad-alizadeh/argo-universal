import type { AddOnlySlotId } from '@repo/contracts/plugins/wire';
import {
  isShownInSlot,
  type SlotChoices,
  useSlotChoices,
} from '#features/settings';
import { type PluginEntry, usePluginEntries } from '../use-plugins';
import type { SlotPlugin } from './slot-settings-model';

export type SlotPluginsLoad =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; plugins: SlotPlugin[] };

// A Plugin that declares the Slot, and is on, is the Server's to ask for the Slot's content.
const fills = (
  slotId: AddOnlySlotId,
  { enabled, manifest }: PluginEntry,
): boolean => enabled && (manifest.contributes.slots ?? []).includes(slotId);

/*
 * The Plugins that fill the Slot, with their switch from what this Device hid. The preview shows each Plugin's name
 * as its sample until the Slot asks the Plugins for real content.
 */
export function toSlotPlugins(
  slotId: AddOnlySlotId,
  entries: readonly PluginEntry[],
  choices: SlotChoices,
): SlotPlugin[] {
  return entries.flatMap((entry) =>
    fills(slotId, entry) ? [toPlugin(entry, choices)] : [],
  );
}

const toPlugin = (
  { manifest }: PluginEntry,
  choices: SlotChoices,
): SlotPlugin => ({
  pluginId: manifest.id,
  name: manifest.name,
  shown: isShownInSlot(choices, manifest.id),
  sample: { text: manifest.name },
});

// The Server's Plugins that fill the Slot, each with this Device's switch, once the Server has answered.
export function useSlotPlugins(slotId: AddOnlySlotId): SlotPluginsLoad {
  const { plugins, isError } = usePluginEntries();
  const choices = useSlotChoices(slotId);

  if (!plugins) return { status: isError ? 'error' : 'loading' };

  return {
    status: 'loaded',
    plugins: toSlotPlugins(slotId, plugins, choices),
  };
}
