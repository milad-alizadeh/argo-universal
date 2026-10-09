import { breaksConvention } from './master-naming.mts';
import { presentedFrames } from './presented.mts';
import type { Registry } from './registry.mts';
import type { Snapshot } from './snapshot-model.mts';

// Registry entries that no longer point at their master, and masters the registry does not know.
export interface RegistryHealth {
  missing: string[];
  renamed: { name: string; now: string }[];
  unregistered: string[];
  // Masters whose name breaks `CodeName (phone) / State`.
  misnamed: string[];
}

function renamedOf(
  snapshot: Snapshot,
  registry: Registry,
): RegistryHealth['renamed'] {
  return registry.masters.flatMap((entry): RegistryHealth['renamed'] => {
    const layer = snapshot.layers[entry.id];
    if (!layer || layer.name === entry.name) return [];
    return [{ name: entry.name, now: layer.name }];
  });
}

function misnamedOf(registry: Registry): string[] {
  return registry.masters
    .map((entry): string => entry.name)
    .filter(breaksConvention);
}

function knownNames(registry: Registry): Set<string> {
  return new Set([
    ...registry.masters.map((entry): string => entry.name),
    ...(registry.notComponents ?? []),
  ]);
}

export function checkRegistry(
  snapshot: Snapshot,
  registry: Registry,
): RegistryHealth {
  return {
    missing: registry.masters
      .filter((entry): boolean => snapshot.layers[entry.id] === undefined)
      .map((entry): string => entry.name),
    renamed: renamedOf(snapshot, registry),
    unregistered: unregisteredOf(snapshot, registry),
    misnamed: misnamedOf(registry),
  };
}

function unregisteredOf(snapshot: Snapshot, registry: Registry): string[] {
  const names = knownNames(registry);
  return presentedFrames(snapshot)
    .map((layer): string => layer.name)
    .filter((name): boolean => !names.has(name));
}
