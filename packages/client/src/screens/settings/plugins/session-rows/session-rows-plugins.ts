import { sessionRowSlotId } from '@repo/contracts/plugins/wire';
import {
  isShownOnSessionRows,
  type SessionRowChoices,
  useSessionRowChoices,
} from '#features/sessions';
import { type PluginEntry, usePluginEntries } from '../use-plugins';
import type { SessionRowsPlugin } from './session-rows-model';
import type { SessionRowsLoad } from './session-rows-view';

// A Plugin that declares the Session row items Slot, and is on, is the Server's to ask for row items.
const fillsSessionRows = ({ enabled, manifest }: PluginEntry): boolean =>
  enabled && (manifest.contributes.slots ?? []).includes(sessionRowSlotId);

/*
 * The Plugins that fill the Slot, with their switch from what this Device hid. The preview shows each Plugin's name
 * as its item until Session rows ask the Plugins for real ones.
 */
export function toSessionRowsPlugins(
  entries: readonly PluginEntry[],
  choices: SessionRowChoices,
): SessionRowsPlugin[] {
  return entries.flatMap((entry) =>
    fillsSessionRows(entry) ? [toPlugin(entry, choices)] : [],
  );
}

const toPlugin = (
  { manifest }: PluginEntry,
  choices: SessionRowChoices,
): SessionRowsPlugin => ({
  pluginId: manifest.id,
  name: manifest.name,
  shown: isShownOnSessionRows(choices, manifest.id),
  sample: { text: manifest.name },
});

// The Server's Plugins that fill Session rows, each with this Device's switch, once the Server has answered.
export function useSessionRowsPlugins(): SessionRowsLoad {
  const { plugins, isError } = usePluginEntries();
  const choices = useSessionRowChoices();

  if (!plugins) return { status: isError ? 'error' : 'loading' };

  return { status: 'loaded', plugins: toSessionRowsPlugins(plugins, choices) };
}
