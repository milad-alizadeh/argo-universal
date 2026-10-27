import { listMediaComponents } from './list-media-components';
import type { WireNode } from './wire';

export type SlotRules = Record<string, readonly string[]>;

export type ChildRule = boolean | readonly string[];

export function acceptsSlots(node: WireNode, rules: SlotRules): boolean {
  const allowed = new Map(Object.entries(rules));

  const valid = Object.entries(node.slots).every(([name, children]) =>
    validSlot(name, children, allowed),
  );

  return valid && validMedia(node);
}

export function acceptsChildren(
  children: WireNode[],
  rule: ChildRule | undefined,
): boolean {
  if (rule === true) return true;

  if (!rule) return children.length === 0;

  return children.every((child) => rule.includes(child.type));
}

// Composition stays within the media vocabulary, including nested children and Slots.
const mediaComponents: ReadonlySet<string> = new Set(listMediaComponents);

function acceptsMedia(node: WireNode): boolean {
  return (
    mediaComponents.has(node.type) &&
    node.children.every(acceptsMedia) &&
    Object.values(node.slots).every((nodes) => nodes.every(acceptsMedia))
  );
}

function validMedia(node: WireNode): boolean {
  if (node.type !== 'ListItem') return true;

  return (node.slots.media ?? []).every(acceptsMedia);
}

function validSlot(
  name: string,
  children: WireNode[],
  allowed: Map<string, readonly string[]>,
): boolean {
  return allowed.has(name) && acceptsChildren(children, allowed.get(name));
}
