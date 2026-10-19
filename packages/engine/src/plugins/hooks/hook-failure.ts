import { ReplaceableInput } from '@repo/contracts/plugins/replaceable';
import { renderFallbackLine } from '../runtime/render-fallback';
import type { RunningHook } from './running-hook';

export function failureLine(
  { hook, step }: RunningHook,
  reason: string,
  refused: boolean,
): string {
  if (step.name === 'ui.render')
    return renderFallbackLine(
      hook.pluginId,
      ReplaceableInput.parse(step.event).slotId,
      reason,
    );

  return `Plugin ${hook.pluginId}: ${refused ? 'guard refused' : 'skipped'} ${step.name} Hook: ${reason}`;
}
