import { useMemo } from 'react';
import { Platform } from 'react-native';
import {
  flatEntries,
  listEntries,
  type SessionsListEntry,
} from '../sessions-list-entries';
import type { SessionsListProps } from './sessions-list-props';

type EntriesInput = Pick<
  SessionsListProps,
  'projects' | 'sessions' | 'query' | 'view'
>;

// Android's full-screen search lists its results as One list, as Paper's search does; elsewhere they stay under their Projects.
const searchListsFlat = Platform.OS === 'android';

export const searchesAsOneList = ({
  query,
}: Pick<SessionsListProps, 'query'>): boolean =>
  searchListsFlat && query !== '';

// One list, and Android's search results, have no Project headings.
export const listsFlat = (
  props: Pick<SessionsListProps, 'query' | 'view'>,
): boolean => props.view.group === 'none' || searchesAsOneList(props);

// A Project with no Sessions keeps its empty row only where new Sessions start: an unsearched Active or All list.
const hidesEmptyProjects = ({
  query,
  view,
}: Pick<EntriesInput, 'query' | 'view'>): boolean =>
  !!query || view.status === 'archived';

function entries(
  input: EntriesInput,
  collapsed: ReadonlySet<string>,
): SessionsListEntry[] {
  const { projects, sessions } = input;

  if (listsFlat(input)) return flatEntries({ projects, sessions });

  return listEntries({
    projects,
    sessions,
    collapsed,
    hideEmptyProjects: hidesEmptyProjects(input),
  });
}

export function useListEntries(
  props: SessionsListProps,
  collapsed: ReadonlySet<string>,
): SessionsListEntry[] {
  const { projects, sessions, query, view } = props;

  return useMemo(
    () => entries({ projects, sessions, query, view }, collapsed),
    [projects, sessions, query, view, collapsed],
  );
}
