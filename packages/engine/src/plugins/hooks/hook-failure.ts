import { ReplaceableInput } from '@repo/contracts/plugins/replaceable';
import { renderFallbackLine } from '../views/render-fallback';
import type { RunningHook } from './running-hook';

export function failureLine(
  { hook, step }: RunningHook,
  reason: string,
): string {
  if (step.name === 'ui.render')
    return renderFallbackLine(
      hook.pluginId,
      ReplaceableInput.parse(step.event).slotId,
      `ui.render Hook: ${reason}`,
    );

  return `Plugin ${hook.pluginId}: skipped ${step.name} Hook: ${reason}`;
}
