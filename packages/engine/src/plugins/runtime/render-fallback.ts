type Log = (line: string) => void;

// A Plugin writes the text of its own failures, so nothing it says may spell a second log line.
export const oneLine = (text: string): string =>
  text.replaceAll(/[\r\n]/g, ' ');

export type Fallback = { pluginId: string; slotId: string; reason: string };

const renderFallbackLine = ({ pluginId, slotId, reason }: Fallback): string =>
  `Plugin ${pluginId}: core fallback ${slotId}: ${oneLine(reason)}`;

export const belowWireMinimum = 'App is below the wire minimum';

// Where a Slot's fall back to core came from: the runtime itself, an App that failed to draw, a `ui.render` Hook, or a Slot contribution that threw.
export type FallbackSource = 'runtime' | 'drawing' | 'hook' | 'contribution';

// A contribution that threw is logged once per Plugin, Slot and reason, however many contexts the Slot is open in.
export function logFallback(
  log: Log,
  source: FallbackSource,
  fallback: Fallback,
): void {
  const { pluginId, slotId, reason } = fallback;
  const parts = source === 'contribution' ? [reason] : [];

  logOnce(
    log,
    fallbackKey(source, pluginId, slotId, ...parts),
    renderFallbackLine(fallback),
  );
}

export const fallbackKey = (
  source: FallbackSource,
  pluginId: string,
  slotId: string,
  ...reason: string[]
): OnceKey => [pluginId, 'core-fallback', source, slotId, ...reason];

// The Plugin id first, then the stable identity of what fell back. Never free-form text a Plugin chose.
export type OnceKey = readonly [pluginId: string, ...identity: string[]];

type Held = { key: OnceKey; repeats: number };

// Per log, every key written once and how often it came back since. Collected with the log.
const written = new WeakMap<Log, Map<string, Held>>();

function writtenTo(log: Log): Map<string, Held> {
  const held = written.get(log) ?? new Map<string, Held>();
  written.set(log, held);

  return held;
}

// Writes `line` the first time `key` is seen on this log and counts every later call instead.
export function logOnce(log: Log, key: OnceKey, line: string): void {
  const held = writtenTo(log);
  const seen = held.get(JSON.stringify(key));

  if (seen) seen.repeats += 1;
  else {
    held.set(JSON.stringify(key), { key, repeats: 0 });
    log(line);
  }
}

// Frees a Plugin's keys, so what it falls back on next is written again. Repeats held back come out as one line each.
export function forgetOnce(log: Log, pluginId: string): void {
  const held = writtenTo(log);

  for (const [id, { key, repeats }] of held)
    if (key[0] === pluginId) {
      held.delete(id);
      logRepeats(log, key, repeats);
    }
}

function logRepeats(
  log: Log,
  [pluginId, ...identity]: OnceKey,
  repeats: number,
): void {
  if (repeats > 0)
    log(
      `Plugin ${pluginId}: ${repeats} more repeats of ${oneLine(identity.join(' '))}`,
    );
}
