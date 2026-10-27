import { replacementTreeReason } from '@repo/contracts/plugins/replacement-tree';
import type {
  PatchOp,
  ReplaceableSlotId,
  WireNode,
} from '@repo/contracts/plugins/wire';
import { pluginPageFallback } from '@repo/contracts/plugins/wire-limits';
import { diff } from '@repo/contracts/plugins/wire-patch';
import type { RefusedSvg } from '../visual/sanitize-tree';
import { logFallback, oneLine } from './render-fallback';

type Log = (line: string) => void;

// The view a line is written about.
type Drawer = { pluginId: string; opening: { path: string } };

/*
 * How a view draws, chosen once when it opens. A page or ordinary Slot draws what it can and says what it
 * left out; a Replaceable Slot's replacement draws whole or not at all, and core draws its own instead
 * (ADR-0027, ADR-0035).
 */
export interface Draws {
  // Closed with what it was opened for, never kept across a Plugin reload.
  readonly temporary: boolean;
  // Why the Plugin's tree cannot be drawn at all, if it cannot.
  failure: (root: WireNode) => string | undefined;
  // What becomes of SVG the sanitiser refused: dropped and logged, or the reason the whole tree is refused.
  refusedSvg: (
    view: Drawer,
    refused: RefusedSvg[],
    log: Log,
  ) => string | undefined;
  // Sent in place of a tree over the wire caps; without one the view fails instead.
  readonly fallback?: WireNode;
  // Takes the App from the tree it holds to the next one; none sends the next tree whole.
  changes: (held: WireNode | null, next: WireNode) => PatchOp[];
  // Writes why the view failed, and says whether the failure is its Plugin's to show.
  failed: (view: Drawer, reason: string, log: Log) => boolean;
  // Writes that the App could not draw what it was sent.
  appFailed: (view: Drawer, reason: string, log: Log) => void;
}

export function drawsFor(opening: { renderSlot?: ReplaceableSlotId }): Draws {
  return opening.renderSlot ? replacement(opening.renderSlot) : page;
}

const page: Draws = {
  temporary: false,
  failure: (root) =>
    root.type === '#render-error' ? reasonOf(root) : undefined,
  refusedSvg: (view, refused, log) => {
    for (const { node, reason } of refused)
      log(
        `Plugin ${view.pluginId}: refused ${view.opening.path} node ${node}: ${reason}`,
      );
  },
  fallback: pluginPageFallback,
  changes: (held, next) => (held ? diff(held, next) : []),
  failed: (view, reason, log) => {
    log(
      `Plugin ${view.pluginId}: could not draw ${view.opening.path}: ${oneLine(reason)}`,
    );

    return true;
  },
  appFailed: () => {},
};

// A replacement's `#render-error` asks for core's own drawing, so it falls back and fails nothing (ADR-0037).
function replacement(slotId: ReplaceableSlotId): Draws {
  return {
    temporary: true,
    failure: (root) => replacementTreeReason(root) ?? undefined,
    refusedSvg: (_view, [first]) => first && `${first.node}: ${first.reason}`,
    changes: () => [],
    failed: (view, reason, log) => {
      logFallback(log, 'runtime', [view.pluginId, slotId, reason]);

      return false;
    },
    appFailed: (view, reason, log) =>
      logFallback(log, 'drawing', [view.pluginId, slotId, reason]),
  };
}

const reasonOf = (root: WireNode): string =>
  typeof root.props.reason === 'string'
    ? root.props.reason
    : 'Plugin could not draw';
