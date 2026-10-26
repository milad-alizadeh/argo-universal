import { sessionRowSlotId } from '@repo/contracts/plugins/wire';
import {
  type HiddenSessionRowPlugins,
  isShownOnSessionRows,
} from '#features/sessions';
import type { PluginEntry } from '../use-plugins';
import type { SessionRowsPlugin } from './session-rows-model';

// A Plugin that declares the Session row items Slot, and is on, is the Server's to ask for row items.
export const fillsSessionRows = ({ enabled, manifest }: PluginEntry): boolean =>
  enabled && (manifest.contributes.slots ?? []).includes(sessionRowSlotId);

/*
 * The Plugins that fill the Slot, with their switch from what this Device hid. The preview shows each Plugin's name
 * as its item until Session rows ask the Plugins for real ones.
 */
export function toSessionRowsPlugins(
  entries: readonly PluginEntry[],
  hidden: HiddenSessionRowPlugins,
): SessionRowsPlugin[] {
  return entries.flatMap((entry) =>
    fillsSessionRows(entry) ? [toPlugin(entry, hidden)] : [],
  );
}

const toPlugin = (
  { manifest }: PluginEntry,
  hidden: HiddenSessionRowPlugins,
): SessionRowsPlugin => ({
  pluginId: manifest.id,
  name: manifest.name,
  shown: isShownOnSessionRows(hidden, manifest.id),
  sample: { text: manifest.name },
});
