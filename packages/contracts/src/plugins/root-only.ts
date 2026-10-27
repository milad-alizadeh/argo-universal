import { kitComponent } from './kit';
import type { WireNode } from './wire';

// A root-only kit component, such as Screen, owns its screen; below the root it would take over the host's header.
export const isRootOnly = (node: WireNode): boolean =>
  Boolean(kitComponent(node.type)?.root);

/*
 * The root-only kit components a node's slot may hold: a root-only kit component's slots are the screen's own views, so ListDetail's
 * detail may be a Screen. Children and every other slot hold none.
 */
export const rootSlotComponents = (
  owner: WireNode,
  slot: string,
): readonly string[] => rootSlots(owner)[slot] ?? [];

function rootSlots(owner: WireNode): Record<string, readonly string[]> {
  const component = kitComponent(owner.type);

  return component?.root ? component.slots : {};
}

// A root-only kit component below the root is refused, unless the slot holding it names it.
export const refusedBelowRoot = (
  child: WireNode,
  roots: readonly string[],
): boolean => isRootOnly(child) && !roots.includes(child.type);
