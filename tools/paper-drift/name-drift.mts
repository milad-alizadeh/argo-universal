import { UNNAMED } from './presented.mts';
import type { Layer, Snapshot } from './snapshot-model.mts';

// Frame names that differ only in case, spacing or punctuation: likely one component spelled two ways.
export interface NameVariant {
  name: string;
  count: number;
}

const NOT_ALPHANUMERIC = /[^\da-z]/g;

function keyOf(name: string): string {
  return name.toLowerCase().replaceAll(NOT_ALPHANUMERIC, '');
}

function isNamedFrame(layer: Layer): boolean {
  return layer.type === 'Frame' && !UNNAMED.test(layer.name);
}

function countNames(snapshot: Snapshot): Map<string, number> {
  const counts = new Map<string, number>();
  for (const layer of Object.values(snapshot.layers).filter(isNamedFrame))
    counts.set(layer.name, (counts.get(layer.name) ?? 0) + 1);
  return counts;
}

export function findNameDrift(snapshot: Snapshot): NameVariant[][] {
  const groups = new Map<string, NameVariant[]>();
  for (const [name, count] of countNames(snapshot)) {
    const key = keyOf(name);
    groups.set(key, [...(groups.get(key) ?? []), { name, count }]);
  }
  return [...groups.values()]
    .filter((group): boolean => group.length > 1)
    .map((group): NameVariant[] =>
      group.toSorted((a, b): number => b.count - a.count),
    );
}
