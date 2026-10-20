import { discover } from './catalog.mts';
import { registryInScope } from './config.mts';
import type { Registry } from './model.mts';
import { readIndices } from './scan.mts';
import { loadRegistry } from './storage.mts';

export async function runRegistry(
  path: string,
  cache: string,
): Promise<Registry> {
  const catalog = discover(await readIndices(cache));

  const registry = registryInScope(await loadRegistry(path), catalog.nodes);

  registry.ambiguousNames = [
    ...new Set(catalog.duplicates.flat().map((node) => node.name)),
  ];

  return registry;
}
