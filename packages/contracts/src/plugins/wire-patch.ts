import type { PatchOp, PatchStep, WireNode } from './wire';

function childAt(node: WireNode, step: PatchStep): WireNode {
  const next =
    typeof step === 'number' ? node.children[step] : node.slots[step];

  if (!next) throw new Error(`Patch path leaves the tree at ${step}`);

  return next;
}

const change =
  (op: PatchOp) =>
  (node: WireNode): WireNode =>
    op.op === 'props' ? { ...node, props: op.props } : op.node;

// Rebuilds the nodes along `path`, so the tree it was given is never mutated.
function update(
  node: WireNode,
  path: readonly PatchStep[],
  apply: (target: WireNode) => WireNode,
): WireNode {
  const [step, ...rest] = path;

  if (step === undefined) return apply(node);
  const next = update(childAt(node, step), rest, apply);

  return typeof step === 'number'
    ? { ...node, children: node.children.with(step, next) }
    : { ...node, slots: { ...node.slots, [step]: next } };
}

const applyOp = (root: WireNode, op: PatchOp): WireNode =>
  update(root, op.path, change(op));

// Applies a patch to a snapshot and returns the new root; the input is left untouched.
export function applyPatch(root: WireNode, ops: readonly PatchOp[]): WireNode {
  return ops.reduce(applyOp, root);
}
