import { isDeepStrictEqual } from 'node:util';
import type { HookEventName } from '@repo/contracts/plugins';
import type { Json, JsonObject } from '@repo/contracts/plugins/hook-protocol';
import { ReplaceableInput } from '@repo/contracts/plugins/replaceable';
import { logOnce } from '../views/render-fallback';
import type { RegisteredHook } from './hook-registry';
import { selectedHook, type RetainedReplacement } from './render-answer';

type Log = (line: string) => void;

type PassOn = {
  name: HookEventName;
  event: JsonObject;
  below: (event: JsonObject) => Promise<Json>;
};

// The chain beneath a Hook. A `ui.render` Hook that passes its row on with other props is written once per Plugin and Slot (ADR-0035).
export const passOn =
  (log: Log, { pluginId }: RegisteredHook, { name, event, below }: PassOn) =>
  (next: JsonObject): Promise<Json> => {
    if (name === 'ui.render' && !isDeepStrictEqual(event.props, next.props))
      logChangedProps(log, pluginId, event);

    return below(next);
  };

function logChangedProps(log: Log, pluginId: string, event: JsonObject): void {
  const { slotId } = ReplaceableInput.parse(event);

  logOnce(
    log,
    [pluginId, 'changed-props', slotId],
    `Plugin ${pluginId}: changed ${slotId} props`,
  );
}

type ShadowingChain = {
  hooks: readonly RegisteredHook[];
  replacements: RetainedReplacement[];
};

// Every other Plugin beneath the Hook whose tree the Slot draws is shadowed: its own change or tree is not drawn.
export function logShadowed(
  log: Log,
  { hooks, replacements }: ShadowingChain,
  { event, answer }: { event: JsonObject; answer: Json },
): void {
  const winner = selectedHook(replacements, answer);

  if (!winner) return;
  const { slotId } = ReplaceableInput.parse(event);

  for (const pluginId of shadowedBy(hooks, winner))
    logOnce(
      log,
      [pluginId, 'shadowed', slotId, winner.pluginId],
      `Plugin ${pluginId}: ${slotId} shadowed by Plugin ${winner.pluginId}'s tree`,
    );
}

const shadowedBy = (
  hooks: readonly RegisteredHook[],
  winner: RegisteredHook,
): string[] =>
  hooks
    .slice(hooks.indexOf(winner) + 1)
    .flatMap(({ pluginId }) =>
      pluginId === winner.pluginId ? [] : [pluginId],
    );
