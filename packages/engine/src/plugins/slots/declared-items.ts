import type { PluginList } from '@repo/contracts/plugins';
import type {
  DeclaredItems,
  DeclaredItemsInput,
} from '@repo/contracts/plugins/declared-slots';
import { slotOrder } from '../plugin-order';

/*
 * A declared Slot's items as the enabled Plugins' manifests list them, in Slot order, each with its Plugin
 * (ADR-0035). Read from the manifests alone, so no Plugin starts for them (ADR-0025 lazy start); where each one sits
 * is the App's to decide, since it depends on the platform and this Device's choices.
 */
export function declaredItems(
  { plugins }: PluginList,
  { slotId }: DeclaredItemsInput,
): DeclaredItems {
  return plugins
    .filter((plugin) => plugin.enabled)
    .toSorted(slotOrder)
    .flatMap(({ manifest }) =>
      (manifest.contributes.declared?.[slotId] ?? []).map((item) => ({
        pluginId: manifest.id,
        item,
      })),
    );
}
