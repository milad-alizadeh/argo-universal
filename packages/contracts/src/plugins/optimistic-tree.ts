import type { MadeOperationCall } from './page-call-payload';
import type { WireNode } from './wire';

type Patches = ReadonlyMap<string, WireNode['props']>;

export type Optimistic = NonNullable<MadeOperationCall['optimistic']>;

/*
 * The tree with an Operation call's optimistic props on the nodes it names by key (ADR-0050). A tree the
 * patch leaves as it was is the very same tree, and so is every branch it does not reach.
 */
export function optimisticTree(
  root: WireNode,
  optimistic: Optimistic,
): WireNode {
  return patched(
    root,
    new Map(optimistic.map(({ key, props }) => [key, props])),
  );
}

// A node's slots are walked as its children are: a row's menu Action sits in its `actions` slot.
function patched(node: WireNode, patches: Patches): WireNode {
  const props = patches.get(node.key);

  const next = {
    ...node,
    props: props ? { ...node.props, ...props } : node.props,
    children: patchedAll(node.children, patches),
    slots: patchedSlots(node.slots, patches),
  };

  return unpatched(node, next) ? node : next;
}

const unpatched = (node: WireNode, next: WireNode): boolean =>
  next.props === node.props &&
  next.children === node.children &&
  next.slots === node.slots;

// The very list, when no node in it changed.
function patchedAll(nodes: WireNode[], patches: Patches): WireNode[] {
  const next = nodes.map((node) => patched(node, patches));

  return next.every((node, index) => node === nodes[index]) ? nodes : next;
}

function patchedSlots(
  slots: WireNode['slots'],
  patches: Patches,
): WireNode['slots'] {
  const names = Object.keys(slots);
  const next = names.map((name) => patchedAll(slots[name] ?? [], patches));

  return next.every((nodes, index) => nodes === slots[names[index] ?? ''])
    ? slots
    : Object.fromEntries(names.map((name, index) => [name, next[index] ?? []]));
}
