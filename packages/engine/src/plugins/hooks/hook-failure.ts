import { ReplaceableInput } from '@repo/contracts/plugins/replaceable';
import { logFallback } from '../views/render-fallback';
import type { RunningHook } from './running-hook';

// A failed `ui.render` Hook falls its Slot back to core on every render: that is written once per Plugin and Slot.
export function logFailure(
  { hook, step }: RunningHook,
  reason: string,
  log: (line: string) => void,
): void {
  if (step.name !== 'ui.render')
    return log(`Plugin ${hook.pluginId}: skipped ${step.name} Hook: ${reason}`);

  const { slotId } = ReplaceableInput.parse(step.event);

  logFallback(log, 'hook', {
    pluginId: hook.pluginId,
    slotId,
    reason: `ui.render Hook: ${reason}`,
  });
}
