import { createHash } from 'node:crypto';
import {
  serialisePluginQuery,
  type PluginQuery,
} from '@repo/contracts/plugins/argo-calls';
import type { QueryOwner } from './query-types';

/*
 * Nothing expires, so the bound is on the warm answers alone: a Plugin that mints a Query per keystroke
 * keeps at most this many that no view holds. An entry a view holds is bounded by that view, which the
 * view lifecycle releases, and is never taken from under the caller that is about to read it.
 */
export const retainedWarmEntries = 1000;

// What the map asks of an entry: whose Project it answers for, whether a view holds it, and how to close it.
export type MappedQuery = {
  owner: Pick<QueryOwner, 'projectId'>;
  watchers: { active: boolean };
  close: () => void;
};

// Re-inserting moves the entry to the end, so the map's own order is least-recently-watched first.
export function keepNewest<Entry>(
  entries: Map<string, Entry>,
  key: string,
  entry: Entry,
): Entry {
  entries.delete(key);
  entries.set(key, entry);

  return entry;
}

// Only entries nobody is watching are dropped, oldest first, until the warm ones are back inside the bound.
export function dropOldest(entries: Map<string, MappedQuery>): number {
  const warm = entries
    .entries()
    .filter(([, entry]) => !entry.watchers.active)
    .toArray();

  const spare = warm.slice(0, Math.max(0, warm.length - retainedWarmEntries));

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
  entries: Map<string, MappedQuery>,
  projectId: string,
): void {
  for (const [key, entry] of entries
    .entries()
    .filter(([, entry]) => entry.owner.projectId === projectId)) {
    entry.close();
    entries.delete(key);
  }
}
