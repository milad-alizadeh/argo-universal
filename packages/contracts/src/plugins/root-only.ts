import { wirePart } from './kit';
import type { WireNode } from './wire';

// A root-only part, such as Page, owns its screen; below the root it would take over the host's header.
export const isRootOnly = (node: WireNode): boolean =>
  Boolean(wirePart(node.type)?.root);

/*
 * The root-only parts a node's slot may hold: a root-only part's slots are the screen's own views, so ListDetail's
 * detail may be a Page. Children and every other slot hold none.
 */
export const rootSlotParts = (
  owner: WireNode,
  slot: string,
): readonly string[] => rootSlots(owner)[slot] ?? [];

function rootSlots(owner: WireNode): Record<string, readonly string[]> {
  const part = wirePart(owner.type);

  return part?.root ? part.slots : {};
}

// A root-only part below the root is refused, unless the slot holding it names it.
export const refusedBelowRoot = (
  child: WireNode,
  roots: readonly string[],
): boolean => isRootOnly(child) && !roots.includes(child.type);
