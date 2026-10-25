import type { RenderFailureInput } from '@repo/contracts/plugins/replaceable';
import type { OpenView } from './open-view';
import { fallbackKey, logOnce, renderFallbackLine } from './render-fallback';

export function reportDrawingFailure(
  view: OpenView | undefined,
  input: RenderFailureInput,
  log: (line: string) => void,
): void {
  if (!view) return;
  reportOwnedDrawing(view, input, log);
}

function reportOwnedDrawing(
  view: OpenView,
  input: RenderFailureInput,
  log: (line: string) => void,
): void {
  if (!ownsDrawing(view, input) || view.draws.kind !== 'replaceable') return;
  const { slotId } = view.draws;

  logOnce(
    log,
    fallbackKey('drawing', view.pluginId, slotId),
    renderFallbackLine(view.pluginId, slotId, input.reason),
  );
}

const ownsDrawing = (view: OpenView, input: RenderFailureInput): boolean =>
  view.opening.viewId === input.viewId && view.revision === input.revision;
