import type { WireNode } from './wire';

export function childNodeKey(parent: string, key: string): string {
  return `${parent}${parent ? '/' : ''}${encodeURIComponent(key)}`;
}

export function slotNodeKey(parent: string, slot: string, key: string): string {
  return childNodeKey(slotParentKey(parent, slot), key);
}

export function findWireNode(
  root: WireNode,
  key: string,
): WireNode | undefined {
  return findNode({ node: root, key: childNodeKey('', root.key) }, key);
}

export function findWireNodeEntry(
  root: WireNode,
  matches: (node: WireNode) => boolean,
): AddressedNode | undefined {
  return findNodeWhere(
    { node: root, key: childNodeKey('', root.key) },
    matches,
  );
}

type AddressedNode = { node: WireNode; key: string };

// Every node's address in the tree, from one walk.
export function wireNodeKeys(root: WireNode): Set<string> {
  const keys = new Set<string>();

  const visit = (current: AddressedNode): void => {
    keys.add(current.key);

    for (const child of descendants(current)) visit(child);
  };

  visit({ node: root, key: childNodeKey('', root.key) });

  return keys;
}

function findNode(current: AddressedNode, key: string): WireNode | undefined {
  if (current.key === key) return current.node;

  return descendants(current)
    .map((child) => findNode(child, key))
    .find((node) => node !== undefined);
}

function findNodeWhere(
  current: AddressedNode,
  matches: (node: WireNode) => boolean,
): AddressedNode | undefined {
  if (matches(current.node)) return current;

  return descendants(current)
    .map((child) => findNodeWhere(child, matches))
    .find((entry) => entry !== undefined);
}

function descendants({ node, key }: AddressedNode): AddressedNode[] {
  return [
    ...node.children.map((child) => ({
      node: child,
      key: childNodeKey(key, child.key),
    })),
    ...Object.entries(node.slots).flatMap(([slot, children]) =>
      children.map((child) => ({
        node: child,
        key: slotNodeKey(key, slot, child.key),
      })),
    ),
  ];
}

export function slotParentKey(parent: string, slot: string): string {
  return `${parent}#${encodeURIComponent(slot)}`;
}
