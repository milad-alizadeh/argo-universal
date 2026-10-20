import { createHash } from 'node:crypto';
import {
  serialisePluginQuery,
  type PluginQuery,
} from '@repo/contracts/plugins/argo-calls';
import type { QueryEntry } from './query-entry';

// Nothing expires, but a Plugin that mints a Query per keystroke must not grow its map without end.
export const retainedEntries = 1000;

// Re-inserting moves the entry to the end, so the map's own order is least-recently-watched first.
export function keepNewest(
  entries: Map<string, QueryEntry>,
  key: string,
  entry: QueryEntry,
): QueryEntry {
  entries.delete(key);
  entries.set(key, entry);

  return entry;
}

// Only entries nobody is watching are dropped, oldest first, until the map is back inside the bound.
export function dropOldest(entries: Map<string, QueryEntry>): number {
  const spare = entries
    .entries()
    .filter(([, entry]) => !entry.watchers.active)
    .take(Math.max(0, entries.size - retainedEntries))
    .toArray();

  for (const [key, entry] of spare) {
    entry.close();
    entries.delete(key);
  }

  return spare.length;
}

export function queryKey(
  projectId: string | undefined,
  query: PluginQuery,
): string {
  const hash = createHash('sha256')
    .update(serialisePluginQuery(query))
    .digest('hex');

  return JSON.stringify([projectId ?? null, hash]);
}

export function removeProject(
  entries: Map<string, QueryEntry>,
  projectId: string,
): void {
  for (const [key, entry] of entries
    .entries()
    .filter(([, entry]) => entry.owner.projectId === projectId)) {
    entry.close();
    entries.delete(key);
  }
}
