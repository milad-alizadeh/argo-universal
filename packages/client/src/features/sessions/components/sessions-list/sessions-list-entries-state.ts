import { useMemo } from 'react';
import {
  flatEntries,
  listEntries,
  type SessionsListEntry,
} from '../sessions-list-entries';
import type { SessionsListProps } from './sessions-list-props';

type EntriesInput = Pick<
  SessionsListProps,
  'projects' | 'sessions' | 'query' | 'archived' | 'flat'
>;

function entries(
  { projects, sessions, query, archived, flat }: EntriesInput,
  collapsed: ReadonlySet<string>,
): SessionsListEntry[] {
  if (flat) return flatEntries({ projects, sessions });

  return listEntries({
    projects,
    sessions,
    collapsed,
    hideEmptyProjects: !!query || archived,
  });
}

export function useListEntries(
  { projects, sessions, query, archived, flat = false }: SessionsListProps,
  collapsed: ReadonlySet<string>,
): SessionsListEntry[] {
  return useMemo(
    () => entries({ projects, sessions, query, archived, flat }, collapsed),
    [projects, sessions, query, archived, flat, collapsed],
  );
}
