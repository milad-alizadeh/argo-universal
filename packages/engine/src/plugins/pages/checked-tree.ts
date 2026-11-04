import type { DrawnTree } from '@repo/contracts/plugins/page-draw';
import { prepareWireTree } from '@repo/contracts/plugins/prepare-tree';
import { replacementTreeReason } from '@repo/contracts/plugins/replacement-tree';
import { WireNode, type WireJson } from '@repo/contracts/plugins/wire';
import {
  pluginMessageBytes,
  pluginPageBytes,
} from '@repo/contracts/plugins/wire-limits';
import { failed, type Failure } from '../protocol/runtime-status';
import { oneLine } from '../runtime/render-fallback';
import { sanitizeTree, type RefusedSvg } from '../visual/sanitize-tree';
import type { Drawn } from './plugin-draws';

export type Checked =
  | { ok: true; root: WireNode; refused: RefusedSvg[] }
  | Failure;

type TreeKind = 'page' | 'replacement';

/*
 * A tree from a worker is the Plugin's own JSON: it is capped as the message it came in, parsed, sanitised,
 * prepared and capped as the page it draws before any App sees it. A page drops the SVG the sanitiser
 * refuses and says which, for its caller to log; a Replaceable Slot's replacement is drawn whole or not at
 * all (ADR-0027), so refused SVG or a node that cannot replace core refuses the whole tree.
 */
export function checkedTree(root: WireJson, kind: TreeKind): Checked {
  const tooLarge = sizeReason(root, pluginMessageBytes, `${kind} message`);

  if (tooLarge) return failed(tooLarge);

  const parsed = WireNode.safeParse(root);

  return parsed.success
    ? sanitized(parsed.data, kind)
    : failed(`The ${kind} drew an invalid Plugin tree`);
}

function sanitized(tree: WireNode, kind: TreeKind): Checked {
  const { root, refused } = sanitizeTree(tree);
  const refusal = kindReason(kind, tree, refused);

  if (refusal) return failed(refusal);

  const prepared = prepareWireTree(root);
  const tooLarge = sizeReason(prepared, pluginPageBytes, `prepared ${kind}`);

  return tooLarge ? failed(tooLarge) : { ok: true, root: prepared, refused };
}

const kindReason = (
  kind: TreeKind,
  tree: WireNode,
  refused: RefusedSvg[],
): string | undefined =>
  kind === 'replacement' ? replacementReason(tree, refused) : undefined;

// Why a replacement cannot be drawn whole: a node that cannot replace core, or SVG the sanitiser refused.
function replacementReason(
  tree: WireNode,
  [first]: RefusedSvg[],
): string | undefined {
  return (
    replacementTreeReason(tree) ?? (first && `${first.node}: ${first.reason}`)
  );
}

type PageAt = { pluginId: string; path: string; log: (line: string) => void };

// A page draws without the SVG the sanitiser refused, and the log says what was left out.
export function checkedPage(
  { pluginId, path, log }: PageAt,
  { root, pages, live }: DrawnTree,
): Drawn {
  const tree = checkedTree(root, 'page');

  if (!tree.ok) return tree;

  for (const { node, reason } of tree.refused)
    log(`Plugin ${pluginId}: refused ${oneLine(path)} node ${node}: ${reason}`);

  return { ok: true, root: tree.root, pages, live };
}

const sizeReason = (
  tree: WireJson | WireNode,
  limit: number,
  kind: string,
): string | undefined =>
  Buffer.byteLength(JSON.stringify(tree), 'utf8') > limit
    ? `${kind} exceeds ${limit} bytes`
    : undefined;
