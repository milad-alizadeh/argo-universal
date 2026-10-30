import type {
  SessionActivityItem,
  SessionRowItem,
} from '@repo/contracts/plugins/wire';
import type {
  SessionRowActivity,
  SessionRowPluginItem,
  SessionRowPlugins,
} from '#features/sessions';
import type { ReadItem, SlotReading } from './slot-items';

const rowItem = (
  { pluginId, pluginName, item }: ReadItem<SessionRowItem>,
  index: number,
): SessionRowPluginItem => ({
  key: `${pluginId}:${index}`,
  pluginId,
  pluginName,
  item,
});

// The chosen Plugin's Activity line, led by that Plugin's glyph, so the reader sees it is not Argo's.
const activityLine = (
  owner: ReadItem<SessionActivityItem> | undefined,
): SessionRowActivity | undefined =>
  owner && { text: owner.item.text, icon: owner.pluginIcon };

/*
 * What a Session row draws from what the reader read of both its Slots: the items that fit, the rest behind "+N",
 * and the chosen Plugin's Activity line. Nothing when no Plugin adds to the row, so it stays Argo's own.
 */
export function sessionRowPlugins(
  row: SlotReading<SessionRowItem>,
  lines: SlotReading<SessionActivityItem>,
): SessionRowPlugins | undefined {
  const activity = activityLine(lines.owner);

  if (!row.items.length && !activity) return undefined;

  return {
    items: row.items.map(rowItem),
    more: row.overflow.map(rowItem),
    activity,
  };
}
