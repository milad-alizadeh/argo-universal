import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { MasterEntry, Registry } from './registry.mts';
import type { Snapshot } from './snapshot-model.mts';

// A master's new name goes to the master, every copy (the name is the link) and the registry.
const renameSchema = z.object({ from: z.string(), to: z.string().max(50) });
const renameMapSchema = z.looseObject({
  renames: z.array(renameSchema.extend({ id: z.string() })),
  aliases: z.array(renameSchema).default([]),
});
type RenameMap = z.infer<typeof renameMapSchema>;

interface NodeRename {
  nodeId: string;
  name: string;
}

export interface RenamePlan {
  updates: NodeRename[];
  registry: Registry;
  problems: string[];
}

export function readRenameMap(path: string): RenameMap {
  return renameMapSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

function newNames(map: RenameMap): Map<string, string> {
  return new Map(
    [...map.renames, ...map.aliases].map((rename): [string, string] => [
      rename.from,
      rename.to,
    ]),
  );
}

function renamed(names: Map<string, string>, name: string): string {
  return names.get(name) ?? name;
}

function renamedEntry(
  names: Map<string, string>,
  entry: MasterEntry,
): MasterEntry {
  const name = renamed(names, entry.name);
  const base = entry.variantOf;
  if (base === undefined) return { ...entry, name };
  return { ...entry, name, variantOf: renamed(names, base) };
}

function missingMasters(snapshot: Snapshot, map: RenameMap): string[] {
  return map.renames
    .filter(
      (rename): boolean => snapshot.layers[rename.id]?.name !== rename.from,
    )
    .map(
      (rename): string =>
        `"${rename.from}" (${rename.id}) is not in the snapshot under that name`,
    );
}

// An alias may point at a name already in use; a master's new name may not.
function takenNames(snapshot: Snapshot, map: RenameMap): string[] {
  const names = newNames(map);
  const targets = new Set(map.renames.map((rename): string => rename.to));
  const clashes = Object.values(snapshot.layers)
    .filter(
      (layer): boolean => targets.has(layer.name) && !names.has(layer.name),
    )
    .map((layer): string => layer.name);
  return [...new Set(clashes)].map(
    (name): string =>
      `"${name}" is already used by a layer that is not renamed`,
  );
}

function layerRenames(
  snapshot: Snapshot,
  names: Map<string, string>,
): NodeRename[] {
  return Object.values(snapshot.layers).flatMap((layer): NodeRename[] => {
    const name = names.get(layer.name);
    return name === undefined ? [] : [{ nodeId: layer.id, name }];
  });
}

function renamedRegistry(
  registry: Registry,
  names: Map<string, string>,
): Registry {
  const masters = registry.masters.map((entry): MasterEntry =>
    renamedEntry(names, entry),
  );
  return { ...registry, masters };
}

export function planRename(
  snapshot: Snapshot,
  registry: Registry,
  map: RenameMap,
): RenamePlan {
  const names = newNames(map);
  return {
    updates: layerRenames(snapshot, names),
    registry: renamedRegistry(registry, names),
    problems: [...missingMasters(snapshot, map), ...takenNames(snapshot, map)],
  };
}
