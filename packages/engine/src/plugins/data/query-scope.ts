import type { PluginQuery } from '@repo/contracts/plugins/argo-calls';
import { keepNewest, queryKey } from './entry-map';
import { QueryEntry, type EntryServices } from './query-entry';
import type {
  DrawnFor,
  QueryOrigin,
  QueryOwner,
  QueryRead,
} from './query-types';

/*
 * A Loader's read holds its Page address, and a background pass, which holds none, reads fresh. Code outside a draw,
 * such as a Slot's provider, reads what was kept, and a list's clock may age it; an Operation run's read was asked for.
 */
export const drawnRead = (
  drawn: DrawnFor | undefined,
  fresh: boolean | undefined,
  forRun?: true,
): QueryRead =>
  drawn
    ? { ...drawn, fresh: fresh === true || drawn.holder === undefined }
    : { fresh: false, outside: true, asked: forRun === true };

// A named read that names its Project is kept for it, whatever Project the draw or the Slot asking runs for.
export const projectOf = (
  query: PluginQuery,
  fallback: string | undefined,
): string | undefined =>
  query.api === 'read' ? (query.projectId ?? fallback) : fallback;

// The Project a named read's Query names, if it does.
export const namedProject = (query: PluginQuery): string | undefined =>
  query.api === 'read' ? query.projectId : undefined;

// Code outside a draw, such as a Slot's provider, reads only a named Query: the one the pages' entries are shared through.
export function refuseOutside(
  { drawn }: QueryOrigin,
  query: PluginQuery,
): void {
  if (!drawn && query.api !== 'read')
    throw new Error('Code outside a draw reads only a named Query');
}

type Projects = () => Promise<string[]>;

async function checkRegistered(
  projects: Projects,
  ids: string[],
): Promise<void> {
  const known = await projects();
  const missing = ids.find((id) => !known.includes(id));

  if (missing !== undefined)
    throw new Error(
      `Project ${missing} is not registered: name a Project from argo.projects.list().`,
    );
}

// A Project a Query names is kept for, and borrowed under, so it must be one Argo has registered; nothing named waits for nothing.
export function requireRegistered(
  projects: Projects,
  named: (string | undefined)[],
): Promise<void> | undefined {
  const ids = named.filter((id) => id !== undefined);

  return ids.length === 0 ? undefined : checkRegistered(projects, ids);
}

/*
 * The Plugin's entry for a Query and Project: the one kept, or a new one. A new entry is the newest, so the
 * Plugin's bound on warm entries drops the oldest first.
 */
export function entryIn(
  entries: Map<string, QueryEntry>,
  owner: QueryOwner,
  services: EntryServices,
): QueryEntry {
  const key = queryKey(owner.projectId, owner.query);
  const existing = entries.get(key);

  if (existing) return keepNewest(entries, key, existing);

  const entry = new QueryEntry(owner, services);

  entries.set(key, entry);

  return entry;
}
