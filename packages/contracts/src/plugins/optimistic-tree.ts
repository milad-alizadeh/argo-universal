import { kitComponent } from './kit';
import type { MadeOperationCall } from './page-call-payload';
import type { WireNode } from './wire';
import { childNodeKey, slotNodeKey } from './wire-node-key';

type Props = WireNode['props'];

// How a node's props change; `undefined` leaves the node as it is. A node is known by its path key, since a key is unique only among its siblings.
type PropsChange = (node: WireNode, path: string) => Props | undefined;

export type Optimistic = NonNullable<MadeOperationCall['optimistic']>;

// A change to a tree, which keeps every branch it does not reach.
export type TreePatch = (root: WireNode) => WireNode;

// What styles a node is Argo's to decide, so an optimistic patch may not set it.
const unpatchable: ReadonlySet<string> = new Set(['className', 'style']);

/*
 * The tree with an Operation call's optimistic props on the nodes it names by key (ADR-0050). A tree the
 * patch leaves as it was is the very same tree, and so is every branch it does not reach. Each prop is
 * checked against the node's kit component, as the Server checks a drawn tree, and a prop that does not fit
 * is not shown, so a Plugin cannot make the App draw what it would have refused.
 */
export const optimisticTree = (
  root: WireNode,
  optimistic: Optimistic,
): WireNode =>
  patched(root, childNodeKey('', root.key), (node) => {
    const named = optimistic.filter(({ key }) => key === node.key);

    return named.length === 0 ? undefined : shownWith(node, named);
  });

// The props a node shows with every patch that names it, each prop that fits its kit component and no other.
const shownWith = (node: WireNode, named: Optimistic): Props =>
  named
    .flatMap(({ props }) => Object.entries(props))
    .reduce(
      (shown, [name, value]) => withFitting(node.type, shown, name, value),
      node.props,
    );

function withFitting(
  type: string,
  shown: Props,
  name: string,
  value: Props[string],
): Props {
  const next = { ...shown, [name]: value };
  const component = kitComponent(type);

  return component &&
    !unpatchable.has(name) &&
    component.props.safeParse(next).success
    ? next
    : shown;
}

/*
 * The patch that takes back only what `optimistic` showed, on whatever tree has been drawn since: each prop a
 * named node still shows as the patch set it gets the value that very node had in `before` back, or goes if
 * it had none. It leaves every other prop, and every other node, as that tree has them; a node `before` did
 * not have is left as it is.
 */
export const optimisticUndo = (
  before: WireNode,
  optimistic: Optimistic,
): TreePatch => {
  const earlier = propsOf(before, new Set(optimistic.map(({ key }) => key)));

  return (root) =>
    patched(root, childNodeKey('', root.key), (node, path) =>
      takenBack(node, optimistic, earlier.get(path)),
    );
};

function takenBack(
  node: WireNode,
  optimistic: Optimistic,
  before: Props | undefined,
): Props | undefined {
  if (!before) return undefined;

  const shown = optimistic
    .filter(({ key }) => key === node.key)
    .flatMap(({ props }) => Object.entries(props))
    .filter(([name, value]) => node.props[name] === value);

  return shown.length === 0 ? undefined : restored(node.props, shown, before);
}

// Each prop the patch showed goes back to what the node had before; one it lacked is taken off.
function restored(
  shown: Props,
  patch: [string, unknown][],
  before: Props,
): Props {
  const names = new Set(patch.map(([name]) => name));

  return Object.fromEntries([
    ...Object.entries(shown).filter(([name]) => !names.has(name)),
    ...Object.entries(before).filter(([name]) => names.has(name)),
  ]);
}

const childrenOf = (node: WireNode): WireNode[] => [
  ...node.children,
  ...Object.values(node.slots).flat(),
];

function* nodesOf(node: WireNode): Generator<WireNode> {
  yield node;

  for (const child of childrenOf(node)) yield* nodesOf(child);
}

// The props each named node shows in the tree, by the node's path key.
function propsOf(
  root: WireNode,
  keys: ReadonlySet<string>,
): Map<string, Props> {
  const found = new Map<string, Props>();

  patched(root, childNodeKey('', root.key), (node, path) => {
    if (keys.has(node.key)) found.set(path, node.props);

    return undefined;
  });

  return found;
}

// The ports an Operation call's optimistic props show through and are taken back by.
export type TreePorts = {
  shown: () => WireNode | undefined;
  patch: (patch: TreePatch) => Promise<void>;
  unpatch: (patch: TreePatch) => void;
};

const keep = (): void => {};

/*
 * Shows the optimistic props at once. The function returned takes back only those, as a failure does, and
 * does nothing when there were none to show.
 */
export const showOptimistic = (
  ports: TreePorts,
  optimistic: Optimistic | undefined,
): Promise<() => void> =>
  optimistic?.length ? showPatch(ports, optimistic) : Promise.resolve(keep);

async function showPatch(
  ports: TreePorts,
  optimistic: Optimistic,
): Promise<() => void> {
  const before = ports.shown();

  if (!before) return keep;

  await ports.patch((root) => optimisticTree(root, optimistic));

  const undo = optimisticUndo(before, optimistic);

  return () => ports.unpatch(undo);
}

// A node's slots are walked as its children are: a row's menu Action sits in its `actions` slot.
function patched(node: WireNode, path: string, change: PropsChange): WireNode {
  const props = change(node, path);

  const next = {
    ...node,
    props: props ?? node.props,
    children: patchedAll(node.children, change, (child) =>
      childNodeKey(path, child.key),
    ),
    slots: patchedSlots(node.slots, path, change),
  };

  return unpatched(node, next) ? node : next;
}

const unpatched = (node: WireNode, next: WireNode): boolean =>
  next.props === node.props &&
  next.children === node.children &&
  next.slots === node.slots;

// The very list, when no node in it changed.
function patchedAll(
  nodes: WireNode[],
  change: PropsChange,
  pathOf: (child: WireNode) => string,
): WireNode[] {
  const next = nodes.map((node) => patched(node, pathOf(node), change));

  return next.every((node, index) => node === nodes[index]) ? nodes : next;
}

function patchedSlots(
  slots: WireNode['slots'],
  path: string,
  change: PropsChange,
): WireNode['slots'] {
  const names = Object.keys(slots);
  const next = names.map((name) =>
    patchedAll(slots[name] ?? [], change, (child) =>
      slotNodeKey(path, name, child.key),
    ),
  );

  return next.every((nodes, index) => nodes === slots[names[index] ?? ''])
    ? slots
    : Object.fromEntries(names.map((name, index) => [name, next[index] ?? []]));
}
