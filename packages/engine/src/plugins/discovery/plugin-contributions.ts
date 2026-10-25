import type {
  HookEventName,
  PluginList,
  PluginManifest,
} from '@repo/contracts/plugins';
import type {
  AddOnlySlotId,
  ReplaceableSlotId,
} from '@repo/contracts/plugins/wire';

type PluginDescriptor = PluginList['plugins'][number];

export const runsBackground = (plugin: PluginDescriptor): boolean =>
  plugin.enabled && plugin.manifest.contributes.background !== undefined;

// A Plugin fills only the add-only Slots its manifest declares; `argo plugin validate` reads the same rule.
export const declaresSlot = (
  manifest: PluginManifest,
  slotId: AddOnlySlotId,
): boolean => (manifest.contributes.slots ?? []).includes(slotId);

export const fillsSlot = (
  plugin: PluginDescriptor,
  slot: { slotId: AddOnlySlotId },
): boolean => plugin.enabled && declaresSlot(plugin.manifest, slot.slotId);

export const hooksEvent = (
  plugin: PluginDescriptor,
  name: HookEventName,
): boolean =>
  plugin.enabled && (plugin.manifest.contributes.hooks ?? []).includes(name);

// A Replaceable Slot is drawn only by a `ui.render` Hook whose manifest names it in `renders`.
export const rendersSlot = (
  plugin: PluginDescriptor,
  slotId: ReplaceableSlotId,
): boolean =>
  hooksEvent(plugin, 'ui.render') &&
  (plugin.manifest.contributes.renders ?? []).includes(slotId);
