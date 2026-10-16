import { useCallback, useMemo, useState } from 'react';
import {
  flatEntries,
  listEntries,
  type SessionsListEntry,
} from '../sessions-list-entries';
import type { SessionsListProps } from './sessions-list-props';

export interface CollapsedProjects {
  collapsed: ReadonlySet<string>;
  toggleProject: (id: string) => void;
}

// Which Project headings are collapsed, and the toggle for one.
export function useCollapsedProjects(): CollapsedProjects {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());

  const toggleProject = useCallback((id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);

      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }, []);

  return { collapsed, toggleProject };
}

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
