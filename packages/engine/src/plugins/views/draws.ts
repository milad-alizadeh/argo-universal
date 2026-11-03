import type { PatchOp, WireNode } from '@repo/contracts/plugins/wire';
import { pluginPageFallback } from '@repo/contracts/plugins/wire-limits';
import { diff } from '@repo/contracts/plugins/wire-patch';
import type { RefusedSvg } from '../visual/sanitize-tree';
import { oneLine } from './render-fallback';

type Log = (line: string) => void;

// The view a line is written about.
type Drawer = { pluginId: string; opening: { path: string } };

// How a page's view draws: what it can, saying what it left out.
export interface Draws {
  // Why the Plugin's tree cannot be drawn at all, if it cannot.
  failure: (root: WireNode) => string | undefined;
  // Drops and logs the SVG the sanitiser refused.
  refusedSvg: (view: Drawer, refused: RefusedSvg[], log: Log) => void;
  // Sent in place of a tree over the wire caps.
  readonly fallback: WireNode;
  // Takes the App from the tree it holds to the next one; none sends the next tree whole.
  changes: (held: WireNode | null, next: WireNode) => PatchOp[];
  // Writes why the view failed.
  failed: (view: Drawer, reason: string, log: Log) => void;
}

export const pageDraws: Draws = {
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
  },
};

const reasonOf = (root: WireNode): string =>
  typeof root.props.reason === 'string'
    ? root.props.reason
    : 'Plugin could not draw';
