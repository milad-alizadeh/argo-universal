import {
  dropOldest,
  keepNewest,
  queryKey,
  removeProject,
  retainedWarmEntries,
} from './entry-map';
import { QueryEntry } from './query-entry';
import type { QueryIntervals } from './query-intervals';
import type { QueryOwner, QueryServices } from './query-types';

export type QueryCaller = Pick<QueryOwner, 'pluginId' | 'generation'>;

// Every Plugin's Query entries, one per Project and Query (ADR-0037), and the bound on the warm answers each keeps.
export class QueryEntries {
  private readonly plugins = new Map<string, Map<string, QueryEntry>>();

  constructor(
    private readonly services: QueryServices,
    private readonly intervals: QueryIntervals,
  ) {}

  entry(
    caller: QueryCaller,
    { query, projectId }: Pick<QueryOwner, 'query' | 'projectId'>,
  ): QueryEntry {
    const entries = this.of(caller.pluginId);
    const key = queryKey(projectId, query);

    const existing = entries.get(key);

    if (existing) return keepNewest(entries, key, existing);
    const entry = this.created({ ...caller, projectId, query });

    entries.set(key, entry);

    return entry;
  }

  private created(owner: QueryOwner): QueryEntry {
    return new QueryEntry(owner, this.services, this.intervals);
  }

  // The warm path keeps answers no view holds, so only the oldest unwatched ones go.
  bound(pluginId: string): void {
    const entries = this.of(pluginId);

    if (entries.size <= retainedWarmEntries) return;
    const dropped = dropOldest(entries);

    if (dropped === 0) return;
    this.services.log(
      `Plugin ${pluginId}: dropped ${dropped} warm Query answers over the ${retainedWarmEntries} kept`,
    );
  }

  of(pluginId: string): Map<string, QueryEntry> {
    const existing = this.plugins.get(pluginId);

    if (existing) return existing;
    const entries = new Map<string, QueryEntry>();
    this.plugins.set(pluginId, entries);

    return entries;
  }

  all(): IteratorObject<QueryEntry> {
    return this.plugins.values().flatMap((entries) => entries.values());
  }

  closePlugin(pluginId: string): void {
    for (const entry of this.of(pluginId).values()) entry.close();
    this.plugins.delete(pluginId);
  }

  removeProject(projectId: string): void {
    for (const entries of this.plugins.values())
      removeProject(entries, projectId);
  }
}
