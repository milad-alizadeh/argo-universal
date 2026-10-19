import type { WireNode } from './wire';

export type SlotRules = Record<string, readonly string[]>;

export type ChildRule = boolean | readonly string[];

export function acceptsSlots(node: WireNode, rules: SlotRules): boolean {
  const allowed = new Map(Object.entries(rules));

  return Object.entries(node.slots).every(
    ([name, children]) =>
      allowed.has(name) && acceptsChildren(children, allowed.get(name)),
  );
}

export function acceptsChildren(
  children: WireNode[],
  rule: ChildRule | undefined,
): boolean {
  if (rule === true) return true;

  if (!rule) return children.length === 0;

  return children.every((child) => rule.includes(child.type));
}
