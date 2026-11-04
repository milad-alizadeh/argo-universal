import type { WireNode } from '@repo/contracts/plugins/wire';
import type { Answer, Kept } from './page-answer';

export type Patches = ReadonlyMap<string, WireNode['props']>;

/*
 * A kept tree with the patched props on the nodes they name. A tree the patch leaves as it was is the same answer,
 * hash and all; a patched one has no hash, since the Server never drew it.
 */
export const patchedAnswer =
  (patches: Patches) =>
  (answer: Answer | undefined): Answer | undefined =>
    answer?.ok ? patchedKept(answer, patches) : answer;

function patchedKept(kept: Kept, patches: Patches): Answer {
  const root = patched(kept.root, patches);

  const { hash: _drawn, ...shown } = kept;

  return root === kept.root ? kept : { ...shown, root };
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
