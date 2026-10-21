import type { PatchOp, PatchStep, ViewMessage, WireNode } from './wire';

function collection(node: WireNode, slot?: string): WireNode[] {
  return slot === undefined ? node.children : (node.slots[slot] ?? []);
}

function withCollection(
  node: WireNode,
  children: WireNode[],
  slot?: string,
): WireNode {
  if (slot === undefined) return { ...node, children };
  const slots = { ...node.slots, [slot]: children };

  if (!children.length) delete slots[slot];

  return { ...node, slots };
}

function stepParts(step: PatchStep): { key: string; slot?: string } {
  return typeof step === 'string' ? { key: step } : step;
}

function update(
  node: WireNode,
  path: readonly PatchStep[],
  apply: (node: WireNode) => WireNode,
): WireNode {
  const [step, ...rest] = path;

  if (step === undefined) return apply(node);
  const { key, slot } = stepParts(step);
  const { index, child, children } = childAt(collection(node, slot), key);

  return withCollection(
    node,
    children.with(index, update(child, rest, apply)),
    slot,
  );
}

function get(node: WireNode, path: readonly PatchStep[]): WireNode {
  let result = node;
  update(node, path, (target) => {
    result = target;

    return target;
  });

  return result;
}

function remove(root: WireNode, path: readonly PatchStep[]): WireNode {
  const last = path.at(-1);

  if (last === undefined) throw new Error('Cannot remove the root');
  const { key, slot } = stepParts(last);

  return update(root, path.slice(0, -1), (node) =>
    withCollection(
      node,
      collection(node, slot).filter((child) => child.key !== key),
      slot,
    ),
  );
}

type Insertion = Extract<PatchOp, { op: 'insert' | 'move' }>;

function insert(root: WireNode, op: Insertion, child: WireNode): WireNode {
  return update(root, op.parent, (node) =>
    withCollection(
      node,
      collection(node, op.slot).toSpliced(op.index, 0, child),
      op.slot,
    ),
  );
}

type PropertyChange = Extract<PatchOp, { op: 'setProps' }>;

function setProps(node: WireNode, op: PropertyChange): WireNode {
  const props = { ...node.props, ...op.props };

  for (const name of op.unset ?? []) delete props[name];

  return { ...node, props };
}

function change(root: WireNode, op: Exclude<PatchOp, Insertion>): WireNode {
  if (op.op === 'remove') return remove(root, op.key);

  if (op.op === 'replace') return update(root, op.key, () => op.node);

  return update(root, op.key, (node) => setProps(node, op));
}

function applyOp(root: WireNode, op: PatchOp): WireNode {
  if (op.op === 'insert') return insert(root, op, op.node);

  if (op.op === 'move')
    return insert(remove(root, op.key), op, get(root, op.key));

  return change(root, op);
}

// Applies a patch without mutating the snapshot the App already holds.
export function applyPatch(root: WireNode, ops: readonly PatchOp[]): WireNode {
  return ops.reduce(applyOp, root);
}

// One message folded onto the tree the reader already holds: a snapshot replaces it, a patch edits it.
export function nextRoot(
  root: WireNode | null,
  message: ViewMessage,
): WireNode | null {
  if (message.type === 'snapshot') return message.root;

  return root && applyPatch(root, message.ops);
}

interface LocatedChild {
  index: number;
  child: WireNode;
  children: WireNode[];
}

function childAt(children: WireNode[], key: string): LocatedChild {
  const index = children.findIndex((child) => child.key === key);
  const child = children[index];

  if (!child) throw new Error('Patch key leaves the tree');

  return { index, child, children };
}
