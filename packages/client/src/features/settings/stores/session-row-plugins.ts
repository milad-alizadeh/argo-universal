import type {
  SessionActivityItem,
  SessionRowItem,
} from '@repo/contracts/plugins/wire';
import type { SystemSymbolSource } from '@repo/kit/symbols/symbol-source';
import type {
  SessionRowActivity,
  SessionRowPluginItem,
  SessionRowPlugins,
} from '#features/sessions';
import {
  type Attributed,
  type Merged,
  ownerItem,
  shownItems,
  type SlotVisibility,
} from './slot-visibility';

// One Session's answers from both Session row Slots, as the Server merged them.
export interface SessionRowAnswer {
  items: Merged<SessionRowItem>;
  lines: Merged<SessionActivityItem>;
}

// A Plugin as a row names it: its name, and its glyph, a generic Plugin glyph when it has none.
export interface RowPlugin {
  name: string;
  icon: SystemSymbolSource;
}

export type PluginOf = (pluginId: string) => RowPlugin;

const named =
  (pluginOf: PluginOf) =>
  (
    { pluginId, item }: Attributed<SessionRowItem>,
    index: number,
  ): SessionRowPluginItem => ({
    key: `${pluginId}:${index}`,
    pluginId,
    pluginName: pluginOf(pluginId).name,
    item,
  });

const namedAll = (
  items: Merged<SessionRowItem>['items'],
  pluginOf: PluginOf,
): SessionRowPluginItem[] => items.map(named(pluginOf));

// The chosen Plugin's line, led by its glyph so the reader sees it is not Argo's; none while the line is Argo's.
function activityOf(
  lines: Merged<SessionActivityItem>,
  visibility: SlotVisibility,
  pluginOf: PluginOf,
): SessionRowActivity | undefined {
  const { owner } = visibility;
  const line = ownerItem(lines, visibility);

  if (owner === null || !line) return undefined;

  return { text: line.text, icon: pluginOf(owner).icon };
}

/*
 * What a Session row draws from the Plugins under this Device's choices: the items of the Plugins left on, the rest
 * behind "+N" with each one's Plugin name, and the chosen Plugin's Activity line. Nothing when no Plugin adds to it,
 * so the row stays Argo's own.
 */
export function sessionRowPlugins(
  answer: SessionRowAnswer,
  visibility: SlotVisibility,
  pluginOf: PluginOf,
): SessionRowPlugins | undefined {
  const { items, overflow } = shownItems(answer.items, visibility);
  const activity = activityOf(answer.lines, visibility, pluginOf);

  if (!items.length && !activity) return undefined;

  return {
    items: namedAll(items, pluginOf),
    more: namedAll(overflow, pluginOf),
    activity,
  };
}
