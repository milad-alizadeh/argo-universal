import type { PaperNode, Registry, Snapshot } from './model.mts';

export function boundaryNames(registry: Registry): Set<string> {
  return new Set([
    ...registry.families.map((family) => family.name),
    ...(registry.ambiguousNames ?? []),
  ]);
}

export function rejectAmbiguous(snapshot: Snapshot, registry: Registry): void {
  const names = new Set(registry.ambiguousNames);

  const ambiguous = snapshot.nodes.find((node) =>
    isNamedComponent(node, names),
  );

  if (ambiguous)
    throw new Error(
      `Ambiguous master name: ${ambiguous.name}; resolve duplicate masters before enrolling or syncing its container`,
    );
}

export function isNamedComponent(node: PaperNode, names: Set<string>): boolean {
  return node.component !== 'Text' && names.has(node.name);
}
