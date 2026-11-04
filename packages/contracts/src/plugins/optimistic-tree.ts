import type { MadeOperationCall } from './page-call-payload';
import type { WireNode } from './wire';

type Props = WireNode['props'];

// How a node's props change, by the node's key.
type PropsChanges = ReadonlyMap<string, (shown: Props) => Props>;

export type Optimistic = NonNullable<MadeOperationCall['optimistic']>;

// A change to a tree, which keeps every branch it does not reach.
export type TreePatch = (root: WireNode) => WireNode;

/*
 * The tree with an Operation call's optimistic props on the nodes it names by key (ADR-0050). A tree the
 * patch leaves as it was is the very same tree, and so is every branch it does not reach.
 */
export const optimisticTree = (
  root: WireNode,
  optimistic: Optimistic,
): WireNode =>
  patched(
    root,
    new Map(
      optimistic.map(({ key, props }) => [
        key,
        (shown): Props => ({ ...shown, ...props }),
      ]),
    ),
  );

/*
 * The patch that takes back only what `optimistic` showed, on whatever tree has been drawn since: each named
 * node gets the props it had in `before` back, unless it no longer shows the optimistic ones, as a node a
 * newer tree drew again does not. It leaves every other prop, and every other node, as that tree has them.
 */
export function optimisticUndo(
  before: WireNode,
  optimistic: Optimistic,
): TreePatch {
  const earlier = propsOf(before, new Set(optimistic.map(({ key }) => key)));

  return (root) =>
    patched(
      root,
      new Map(
        optimistic.map(({ key, props }) => [
          key,
          (shown): Props =>
            isShowing(shown, props)
              ? restored(shown, props, earlier.get(key))
              : shown,
        ]),
      ),
    );
}

const isShowing = (shown: Props, patch: Props): boolean =>
  Object.entries(patch).every(([name, value]) => shown[name] === value);

// The patched props go back to what the node had before; one it lacked is taken off.
function restored(
  shown: Props,
  patch: Props,
  before: Props | undefined,
): Props {
  const named = ([name]: [string, unknown]): boolean =>
    Object.hasOwn(patch, name);

  return Object.fromEntries([
    ...Object.entries(shown).filter((entry) => !named(entry)),
    ...Object.entries(before ?? {}).filter(named),
  ]);
}

// The props each named node shows in the tree; the first node of a key stands for it.
function propsOf(
  root: WireNode,
  keys: ReadonlySet<string>,
): Map<string, Props> {
  const found = new Map<string, Props>();

  const visit = (node: WireNode): void => {
    if (keys.has(node.key) && !found.has(node.key))
      found.set(node.key, node.props);

    for (const child of [...node.children, ...Object.values(node.slots).flat()])
      visit(child);
  };

  visit(root);

  return found;
}

// A node's slots are walked as its children are: a row's menu Action sits in its `actions` slot.
function patched(node: WireNode, changes: PropsChanges): WireNode {
  const change = changes.get(node.key);

  const next = {
    ...node,
    props: change ? change(node.props) : node.props,
    children: patchedAll(node.children, changes),
    slots: patchedSlots(node.slots, changes),
  };

  return unpatched(node, next) ? node : next;
}

const unpatched = (node: WireNode, next: WireNode): boolean =>
  next.props === node.props &&
  next.children === node.children &&
  next.slots === node.slots;

// The very list, when no node in it changed.
function patchedAll(nodes: WireNode[], changes: PropsChanges): WireNode[] {
  const next = nodes.map((node) => patched(node, changes));

  return next.every((node, index) => node === nodes[index]) ? nodes : next;
}

function patchedSlots(
  slots: WireNode['slots'],
  changes: PropsChanges,
): WireNode['slots'] {
  const names = Object.keys(slots);
  const next = names.map((name) => patchedAll(slots[name] ?? [], changes));

  return next.every((nodes, index) => nodes === slots[names[index] ?? ''])
    ? slots
    : Object.fromEntries(names.map((name, index) => [name, next[index] ?? []]));
}
