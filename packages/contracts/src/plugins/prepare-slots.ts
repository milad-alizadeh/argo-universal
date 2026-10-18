import type { WireNode } from './wire';

export type SlotRules = Record<string, readonly string[]>;

export function acceptsSlots(node: WireNode, rules: SlotRules): boolean {
  const allowed = new Map(Object.entries(rules));

  return Object.entries(node.slots).every(([name, children]) =>
    acceptsChildren(children, allowed.get(name)),
  );
}

function acceptsChildren(
  children: WireNode[],
  types: readonly string[] | undefined,
): boolean {
  return (
    types !== undefined && children.every((child) => types.includes(child.type))
  );
}
