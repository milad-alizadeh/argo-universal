import type {
  HookEventName,
  PluginList,
  PluginManifest,
} from '@repo/contracts/plugins';
import type { SlotId } from '@repo/contracts/plugins/wire';

type PluginDescriptor = PluginList['plugins'][number];

// A Plugin fills only the Slots its manifest declares; `argo plugin validate` reads the same rule.
export const declaresSlot = (
  manifest: PluginManifest,
  slotId: SlotId,
): boolean => (manifest.contributes.slots ?? []).includes(slotId);

export const fillsSlot = (
  plugin: PluginDescriptor,
  slot: { slotId: SlotId },
): boolean => plugin.enabled && declaresSlot(plugin.manifest, slot.slotId);

export const hooksEvent = (
  plugin: PluginDescriptor,
  name: HookEventName,
): boolean =>
  plugin.enabled && (plugin.manifest.contributes.hooks ?? []).includes(name);

export const rendersSlot = (
  plugin: PluginDescriptor,
  slotId: SlotId,
): boolean => hooksEvent(plugin, 'ui.render') && fillsSlot(plugin, { slotId });
