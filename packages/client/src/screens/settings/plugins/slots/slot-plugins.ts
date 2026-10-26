import { slotVisibility, useSlotChoices } from '#features/settings';
import { usePluginEntries } from '../use-plugins';
import { toSlotPlugins } from './slot-plugin-list';
import type { SlotSettings } from './slot-settings';
import type { SlotPlugin } from './slot-settings-model';

export type SlotPluginsLoad =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; plugins: SlotPlugin[] };

// The Server's Plugins that fill the Slot, each with this Device's switch, once the Server has answered.
export function useSlotPlugins(settings: SlotSettings): SlotPluginsLoad {
  const { plugins, isError } = usePluginEntries();
  const choices = useSlotChoices(settings.slotId);

  if (!plugins) return { status: isError ? 'error' : 'loading' };

  return {
    status: 'loaded',
    plugins: toSlotPlugins(settings, plugins, slotVisibility(choices).shows),
  };
}
