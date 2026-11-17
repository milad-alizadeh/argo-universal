import type { PluginList, PluginManifest } from '@repo/contracts/plugins';
import type { AddOnlySlotId } from '@repo/contracts/plugins/wire';

type PluginDescriptor = PluginList['plugins'][number];

// A Plugin with a nav item starts with the Server too, so the first draw of its page finds it running.
export const startsWithServer = (plugin: PluginDescriptor): boolean =>
  plugin.enabled &&
  (plugin.manifest.contributes.background !== undefined ||
    plugin.manifest.contributes.watch !== undefined ||
    plugin.manifest.contributes.nav.length > 0);

// A Plugin fills only the add-only Slots its manifest declares; `argo plugin validate` reads the same rule.
export const declaresSlot = (
  manifest: PluginManifest,
  slotId: AddOnlySlotId,
): boolean => (manifest.contributes.slots ?? []).includes(slotId);

export const fillsSlot = (
  plugin: PluginDescriptor,
  slot: { slotId: AddOnlySlotId },
): boolean => plugin.enabled && declaresSlot(plugin.manifest, slot.slotId);
