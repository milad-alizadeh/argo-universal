import { discover } from './catalog.mts';
import type { Registry } from './model.mts';
import { readIndices } from './scan.mts';
import { loadRegistry } from './storage.mts';

export async function runRegistry(
  path: string,
  cache: string,
): Promise<Registry> {
  const registry = await loadRegistry(path);
  const catalog = discover(await readIndices(cache));
  registry.ambiguousNames = [
    ...new Set(catalog.duplicates.flat().map((node) => node.name)),
  ];

  return registry;
}
