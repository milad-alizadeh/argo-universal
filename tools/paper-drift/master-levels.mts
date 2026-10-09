import type { MasterEntry, Registry } from './registry.mts';
import { nameOf, type Snapshot } from './snapshot-model.mts';

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

function nestedNames(walk: Walk, id: string): string[] {
  const children = walk.snapshot.layers[id]?.children ?? [];
  return children.flatMap((child): string[] =>
    walk.byName.has(nameOf(walk.snapshot, child))
      ? [nameOf(walk.snapshot, child)]
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

function walkOf(snapshot: Snapshot, masters: MasterEntry[]): Walk {
  const byName = new Map(
    masters.map((entry): [string, MasterEntry] => [entry.name, entry]),
  );
  return { snapshot, byName, depths: new Map() };
}

export function masterLevels(snapshot: Snapshot, registry: Registry): Level[] {
  const synced = registry.masters.filter((entry): boolean => !entry.shell);
  const walk = walkOf(snapshot, synced);
  for (const entry of synced) depthOf(walk, entry);
  return grouped(walk.depths);
}

function namesInside(walk: Walk, id: string): string[] {
  const children = walk.snapshot.layers[id]?.children ?? [];
  return children.flatMap((child): string[] => {
    const name = nameOf(walk.snapshot, child);
    const own = walk.byName.has(name) ? [name] : [];
    return [...own, ...namesInside(walk, child)];
  });
}

// Pairs of names where one master holds the other, so they cannot share one snapshot's sync.
export function nestedPairs(
  snapshot: Snapshot,
  registry: Registry,
  names: string[],
): string[] {
  const walk = walkOf(snapshot, registry.masters);
  const asked = new Set(names);
  return names.flatMap((name): string[] =>
    namesInside(walk, walk.byName.get(name)?.id ?? '')
      .filter((inner): boolean => asked.has(inner))
      .map((inner): string => `"${name}" holds "${inner}"`),
  );
}
