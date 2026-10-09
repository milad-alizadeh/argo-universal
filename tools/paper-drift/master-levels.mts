import type { MasterEntry, Registry } from './registry.mts';
import type { Snapshot } from './snapshot-model.mts';

// Sync order: a master follows every master nested in it, so no two plans in a level touch one layer.
export interface Level {
  depth: number;
  names: string[];
}

interface Walk {
  snapshot: Snapshot;
  byName: Map<string, MasterEntry>;
  depths: Map<string, number>;
}

function nameAt(walk: Walk, id: string): string {
  return walk.snapshot.layers[id]?.name ?? '';
}

function nestedNames(walk: Walk, id: string): string[] {
  const children = walk.snapshot.layers[id]?.children ?? [];
  return children.flatMap((child): string[] =>
    walk.byName.has(nameAt(walk, child))
      ? [nameAt(walk, child)]
      : nestedNames(walk, child),
  );
}

function depthOf(walk: Walk, entry: MasterEntry): number {
  const known = walk.depths.get(entry.name);
  if (known !== undefined) return known;
  walk.depths.set(entry.name, 0);
  const nested = nestedNames(walk, entry.id).flatMap((name): number[] => {
    const inner = walk.byName.get(name);
    return inner ? [depthOf(walk, inner) + 1] : [];
  });
  const depth = Math.max(0, ...nested);
  walk.depths.set(entry.name, depth);
  return depth;
}

function grouped(depths: Map<string, number>): Level[] {
  const levels = new Map<number, string[]>();
  for (const [name, depth] of depths)
    levels.set(depth, [...(levels.get(depth) ?? []), name]);
  return [...levels]
    .map(([depth, names]): Level => ({ depth, names: names.toSorted() }))
    .toSorted((a, b): number => a.depth - b.depth);
}

export function masterLevels(snapshot: Snapshot, registry: Registry): Level[] {
  const synced = registry.masters.filter((entry): boolean => !entry.shell);
  const byName = new Map(
    synced.map((entry): [string, MasterEntry] => [entry.name, entry]),
  );
  const walk: Walk = { snapshot, byName, depths: new Map() };
  for (const entry of synced) depthOf(walk, entry);
  return grouped(walk.depths);
}
