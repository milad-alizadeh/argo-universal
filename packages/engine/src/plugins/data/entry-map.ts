import { createHash } from 'node:crypto';
import {
  serialisePluginQuery,
  type PluginQuery,
} from '@repo/contracts/plugins/argo-calls';
import type { QueryOwner } from './query-types';

/*
 * Nothing expires, so the bound is on the answers kept: a Plugin that mints a Query per keystroke keeps at
 * most this many. The entry a caller is about to read is the newest, so it is never the one dropped.
 */
export const retainedWarmEntries = 1000;

// What the map asks of an entry: whose Project it answers for, and how to close it.
export type MappedQuery = {
  owner: Pick<QueryOwner, 'projectId'>;
  close: () => void;
};

// Re-inserting moves the entry to the end, so the map's own order is least-recently-read first.
export function keepNewest<Entry>(
  entries: Map<string, Entry>,
  key: string,
  entry: Entry,
): Entry {
  entries.delete(key);
  entries.set(key, entry);

  return entry;
}

// Entries are dropped oldest first until the map is back inside the bound.
export function dropOldest<Entry extends MappedQuery>(
  entries: Map<string, Entry>,
): number {
  const kept = entries.entries().toArray();

  const spare = kept.slice(0, Math.max(0, kept.length - retainedWarmEntries));

  for (const [key, entry] of spare) {
    entry.close();
    entries.delete(key);
  }

  return spare.length;
}

// The oldest answers kept go first.
export function boundWarm<Entry extends MappedQuery>(
  entries: Map<string, Entry>,
  log: (line: string) => void,
  pluginId: string,
): void {
  if (entries.size <= retainedWarmEntries) return;
  const dropped = dropOldest(entries);

  if (dropped === 0) return;
  log(
    `Plugin ${pluginId}: dropped ${dropped} warm Query answers over the ${retainedWarmEntries} kept`,
  );
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

// Closes and drops the entries `drops` picks, such as those of a removed Project.
export function removeWhere<Entry extends MappedQuery>(
  entries: Map<string, Entry>,
  drops: (entry: Entry) => boolean,
): void {
  for (const [key, entry] of entries
    .entries()
    .filter(([, entry]) => drops(entry))) {
    entry.close();
    entries.delete(key);
  }
}
