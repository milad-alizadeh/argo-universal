import { oneLine } from './log-line';

export const renderFallbackLine = (
  pluginId: string,
  slotId: string,
  reason: string,
): string => `Plugin ${pluginId}: core fallback ${slotId}: ${oneLine(reason)}`;

export const belowWireMinimum = 'App is below the wire minimum';

// Logged once when an App older than the wire minimum opens a page or ordinary Slot (ADR-0034).
export const updateArgoLine = (pluginId: string, path: string): string =>
  `Plugin ${pluginId}: Update Argo ${path}: ${belowWireMinimum}`;

// Where a Slot's fall back to core came from: the runtime itself, an App that failed to draw, a `ui.render` Hook, or a Slot contribution that threw.
export type FallbackSource = 'runtime' | 'drawing' | 'hook' | 'contribution';

export type Fallback = [pluginId: string, slotId: string, reason: string];

// A contribution that threw is logged once per Plugin, Slot and reason, however many contexts the Slot is open in.
export function logFallback(
  log: (line: string) => void,
  source: FallbackSource,
  [pluginId, slotId, reason]: Fallback,
): void {
  const parts = source === 'contribution' ? [reason] : [];

  logOnce(
    log,
    fallbackKey(source, pluginId, slotId, ...parts),
    renderFallbackLine(pluginId, slotId, reason),
  );
}

export const fallbackKey = (
  source: FallbackSource,
  pluginId: string,
  slotId: string,
  ...reason: string[]
): OnceKey => [pluginId, 'core-fallback', source, slotId, ...reason];

export const updateArgoKey = (pluginId: string, path: string): OnceKey => [
  pluginId,
  'update-argo',
  path,
];

// The Plugin id first, then the stable identity of what fell back. Never free-form text a Plugin chose.
export type OnceKey = readonly [pluginId: string, ...identity: string[]];

type Log = (line: string) => void;

type Held = { identity: string; count: number };

// Per log: Plugin id -> key -> what was held back. Collected with the log; one Plugin's keys leave with `forgetOnce`.
const held = new WeakMap<Log, Map<string, Map<string, Held>>>();

function heldFor(log: Log, pluginId: string): Map<string, Held> {
  const plugins = held.get(log) ?? new Map<string, Map<string, Held>>();
  const repeats = plugins.get(pluginId) ?? new Map<string, Held>();

  held.set(log, plugins.set(pluginId, repeats));

  return repeats;
}

// Writes `line` the first time `key` is seen on this log and counts every later call instead.
export function logOnce(log: Log, key: OnceKey, line: string): void {
  const repeats = heldFor(log, key[0]);
  const id = JSON.stringify(key);
  const seen = repeats.get(id);

  if (seen) seen.count += 1;
  else {
    repeats.set(id, { identity: key.slice(1).join(' '), count: 0 });
    log(line);
  }
}

function take(log: Log, pluginId: string): Held[] {
  const plugins = held.get(log) ?? new Map<string, Map<string, Held>>();
  const repeats = plugins.get(pluginId) ?? new Map<string, Held>();

  plugins.delete(pluginId);

  return [...repeats.values()];
}

// Frees a Plugin's keys, so what it falls back on next is written again. Repeats held back come out as one line each.
export function forgetOnce(log: Log, pluginId: string): void {
  for (const { identity, count } of take(log, pluginId))
    if (count > 0)
      log(`Plugin ${pluginId}: ${count} more repeats of ${identity}`);
}
