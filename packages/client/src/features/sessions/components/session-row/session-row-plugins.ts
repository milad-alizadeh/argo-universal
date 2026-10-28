import type { SessionRowItem } from '@repo/contracts/plugins/wire';
import type { SystemSymbolSource } from '@repo/kit/symbols/symbol-source';
import type {
  SessionRowActivity,
  SessionRowPluginItem,
  SessionRowPlugins,
} from './session-row-props';

// A Plugin as a row names it: its name, and its glyph, a generic Plugin glyph when it has none.
export interface PluginIdentity {
  name: string;
  icon: SystemSymbolSource;
}

export type PluginLookup = (pluginId: string) => PluginIdentity;

interface PluginRowItem {
  pluginId: string;
  item: SessionRowItem;
}

/*
 * What this Device shows of one Session's answers, once its choices apply: the items split as the Server split them,
 * and the chosen Plugin's Activity line, when that Plugin has one for the Session.
 */
export interface ShownRowAnswer {
  items: readonly PluginRowItem[];
  overflow: readonly PluginRowItem[];
  activity?: { pluginId: string; text: string };
}

const toRowItem =
  (lookup: PluginLookup) =>
  ({ pluginId, item }: PluginRowItem, index: number): SessionRowPluginItem => ({
    key: `${pluginId}:${index}`,
    pluginId,
    pluginName: lookup(pluginId).name,
    item,
  });

const toRowItems = (
  items: readonly PluginRowItem[],
  lookup: PluginLookup,
): SessionRowPluginItem[] => items.map(toRowItem(lookup));

/*
 * What a Session row draws from the Plugins: the items that fit, the rest behind "+N" with each one's Plugin name, and
 * the chosen Plugin's Activity line led by its glyph, so the reader sees it is not Argo's. Nothing when no Plugin adds
 * to it, so the row stays Argo's own.
 */
export function sessionRowPlugins(
  shown: ShownRowAnswer,
  lookup: PluginLookup,
): SessionRowPlugins | undefined {
  if (!shown.items.length && !shown.activity) return undefined;

  return {
    items: toRowItems(shown.items, lookup),
    more: toRowItems(shown.overflow, lookup),
    activity: activityLine(shown.activity, lookup),
  };
}

const activityLine = (
  activity: ShownRowAnswer['activity'],
  lookup: PluginLookup,
): SessionRowActivity | undefined =>
  activity && { text: activity.text, icon: lookup(activity.pluginId).icon };
