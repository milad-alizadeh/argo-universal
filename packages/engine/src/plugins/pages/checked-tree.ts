import { prepareWireTree } from '@repo/contracts/plugins/prepare-tree';
import { replacementTreeReason } from '@repo/contracts/plugins/replacement-tree';
import { WireNode, type WireJson } from '@repo/contracts/plugins/wire';
import { pluginPageBytes } from '@repo/contracts/plugins/wire-limits';
import { sanitizeTree } from '../visual/sanitize-tree';

export type Checked =
  | { ok: true; root: WireNode }
  | { ok: false; error: string };

/*
 * A tree from a worker is the Plugin's own JSON: it is parsed, capped, sanitised and prepared before any App
 * sees it. A page drops the SVG the sanitiser refuses; a Replaceable Slot's replacement is drawn whole or
 * not at all (ADR-0027), so refused SVG or a node that cannot replace core refuses the whole tree.
 */
export function checkedTree(root: WireJson, kind: TreeKind): Checked {
  const parsed = WireNode.safeParse(root);

  return parsed.success
    ? admitted(parsed.data, kind)
    : failed(`The ${kind} drew an invalid Plugin tree`);
}

function admitted(tree: WireNode, kind: TreeKind): Checked {
  const reason = sizeReason(tree, kind) ?? kindReason(tree, kind);

  return reason ? failed(reason) : sanitized(tree, kind);
}

type TreeKind = 'page' | 'replacement';

const kindReason = (tree: WireNode, kind: TreeKind): string | undefined =>
  kind === 'replacement' ? replacementTreeReason(tree) : undefined;

function sanitized(tree: WireNode, kind: TreeKind): Checked {
  const { root, refused } = sanitizeTree(tree);
  const refusal = refusedReason(refused, kind);

  if (refusal) return failed(refusal);

  const prepared = prepareWireTree(root);
  const tooLarge = sizeReason(prepared, `prepared ${kind}`);

  return tooLarge ? failed(tooLarge) : { ok: true, root: prepared };
}

// A page draws without what the sanitiser refused; a replacement is refused with it.
function refusedReason(
  refused: ReturnType<typeof sanitizeTree>['refused'],
  kind: TreeKind,
): string | undefined {
  const [first] = refused;

  return kind === 'replacement' && first
    ? `${first.node}: ${first.reason}`
    : undefined;
}

const failed = (error: string): Checked => ({ ok: false, error });

const sizeReason = (tree: WireNode, kind: string): string | undefined =>
  Buffer.byteLength(JSON.stringify(tree), 'utf8') > pluginPageBytes
    ? `${kind} exceeds ${pluginPageBytes} bytes`
    : undefined;
