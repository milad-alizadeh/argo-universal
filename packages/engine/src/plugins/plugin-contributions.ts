import type { HookEventName } from '@repo/contracts/plugins';
import type { SlotId } from '@repo/contracts/plugins/wire';
import type { PluginDescriptor } from './located-plugins';

export const fillsSlot = (
  plugin: PluginDescriptor,
  slot: { slotId: SlotId },
): boolean =>
  plugin.enabled &&
  (plugin.manifest.contributes.slots ?? []).includes(slot.slotId);

export const hooksEvent = (
  plugin: PluginDescriptor,
  name: HookEventName,
): boolean =>
  plugin.enabled && (plugin.manifest.contributes.hooks ?? []).includes(name);

export const rendersSlot = (
  plugin: PluginDescriptor,
  slotId: SlotId,
): boolean => hooksEvent(plugin, 'ui.render') && fillsSlot(plugin, { slotId });
