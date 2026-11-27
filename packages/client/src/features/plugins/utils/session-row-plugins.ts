import type { SessionRowItem } from '@repo/contracts/plugins/wire';
import type {
  SessionRowPluginItem,
  SessionRowPlugins,
} from '#features/sessions';
import type { ReadItem, SlotReading } from './slot-items';

// Keyed by its place in the whole row: "+N" lists shown items that did not fit beside held ones, so keys never repeat.
const rowItem =
  (start: number) =>
  (
    { pluginId, pluginName, item }: ReadItem<SessionRowItem>,
    index: number,
  ): SessionRowPluginItem => ({
    key: `${pluginId}:${start + index}`,
    pluginId,
    pluginName,
    item,
  });

/*
 * What a Session row draws from what the reader read of its Slot: the items that fit and the rest behind "+N".
 * Nothing when no Plugin adds to the row, so it stays Argo's own.
 */
export function sessionRowPlugins(
  row: SlotReading<SessionRowItem>,
): SessionRowPlugins | undefined {
  if (!row.items.length) return undefined;

  return {
    items: row.items.map(rowItem(0)),
    more: row.overflow.map(rowItem(row.items.length)),
  };
}
