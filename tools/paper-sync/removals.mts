import type { Binding, Snapshot } from './model.mts';

export function removals(copy: Snapshot, binding: Binding): string[] {
  const retained = new Set(Object.values(binding.nodes));
  const removed = copy.nodes.filter((node) => !retained.has(node.id));
  const protectedNode = removed.find((node) => node.nested || !node.isVisible);

  if (protectedNode)
    throw new Error(
      `Cannot remove unmatched hidden or nested layer: ${protectedNode.name}; preserve its identity before sync`,
    );

  return removed.map((node) => node.id);
}
