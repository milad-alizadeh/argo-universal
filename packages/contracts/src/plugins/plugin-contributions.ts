import type { HookEventName } from './hooks';
import type { PluginList } from './plugins';
import type { ReplaceableSlotId } from './wire';

type PluginDescriptor = PluginList['plugins'][number];

export const hooksEvent = (
  plugin: PluginDescriptor,
  name: HookEventName,
): boolean =>
  plugin.enabled && (plugin.manifest.contributes.hooks ?? []).includes(name);

// A Replaceable Slot is drawn only by a `ui.render` Hook whose manifest names it in `renders`. The Server runs that chain from this rule, and the App opens a Slot's stream from it.
export const rendersSlot = (
  plugin: PluginDescriptor,
  slotId: ReplaceableSlotId,
): boolean =>
  hooksEvent(plugin, 'ui.render') &&
  (plugin.manifest.contributes.renders ?? []).includes(slotId);
