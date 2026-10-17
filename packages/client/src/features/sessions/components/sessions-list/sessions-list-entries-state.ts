import { useMemo } from 'react';
import {
  flatEntries,
  listEntries,
  type SessionsListEntry,
} from '../sessions-list-entries';
import type { SessionsListProps } from './sessions-list-props';

type EntriesInput = Pick<
  SessionsListProps,
  'projects' | 'sessions' | 'query' | 'status' | 'order' | 'group' | 'flat'
>;

// Search results and One list have no Project headings.
export const listsFlat = ({
  flat,
  group,
}: Pick<SessionsListProps, 'flat' | 'group'>): boolean =>
  flat === true || group === 'none';

// A Project with no Sessions keeps its empty row only where new Sessions start: an unsearched Active or All list.
const hidesEmptyProjects = ({
  query,
  status,
}: Pick<EntriesInput, 'query' | 'status'>): boolean =>
  !!query || status === 'archived';

function entries(
  input: EntriesInput,
  collapsed: ReadonlySet<string>,
): SessionsListEntry[] {
  const { projects, sessions } = input;
  const order = input.order ?? 'activity';

  if (listsFlat(input)) return flatEntries({ projects, sessions, order });

  return listEntries({
    projects,
    sessions,
    collapsed,
    hideEmptyProjects: hidesEmptyProjects(input),
    order,
  });
}

export function useListEntries(
  props: SessionsListProps,
  collapsed: ReadonlySet<string>,
): SessionsListEntry[] {
  const { projects, sessions, query, status, order, group, flat } = props;

  return useMemo(
    () =>
      entries(
        { projects, sessions, query, status, order, group, flat },
        collapsed,
      ),
    [projects, sessions, query, status, order, group, flat, collapsed],
  );
}
