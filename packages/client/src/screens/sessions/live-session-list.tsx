import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useConnectionState, useTRPC } from '#features/connection';
import {
  liveUpdatesStopped,
  type QueryProgress,
  RenameSessionDialog,
  type SessionsLayout,
  sessionsLoadState,
} from '#features/sessions';
import {
  newSessionHref,
  projectHref,
  sessionHref,
  useNavigate,
} from '#lib/product/navigation/navigation';
import {
  SessionListView,
  type SessionListViewProps,
} from './session-list-view';
import { useRenameSession } from './use-rename-session';
import { useSessionListUpdates } from './use-session-list-updates';
import { useSessionPages } from './use-session-pages';

export interface LiveSessionListProps {
  query: string;
  onQueryChange: (query: string) => void;
  archived: boolean;
  layout: SessionsLayout;
  // The open Session, which the wide sidebar marks.
  selectedSessionId?: string;
}

type SessionListLookups = Pick<SessionListViewProps, 'projects' | 'agents'> & {
  progress: QueryProgress[];
};

const queryProgress = (query: {
  isError: boolean;
  isPending: boolean;
}): QueryProgress => ({ failed: query.isError, pending: query.isPending });

// The Projects and Agents each Session row is drawn with.
function useSessionListLookups(): SessionListLookups {
  const trpc = useTRPC();
  const projects = useQuery(trpc.projects.list.queryOptions());
  const agents = useQuery(trpc.agents.servers.queryOptions());

  return {
    projects: projects.data ?? [],
    agents: agents.data ?? [],
    progress: [queryProgress(projects), queryProgress(agents)],
  };
}

function useLiveUpdatesStatus(): Pick<
  SessionListViewProps,
  'liveUpdatesStopped'
> {
  const listUpdates = useSessionListUpdates();
  const connection = useConnectionState();

  return {
    liveUpdatesStopped: liveUpdatesStopped(listUpdates.status, connection),
  };
}

function useSessionsNavigation(): Pick<
  SessionListViewProps,
  'onSelect' | 'onNewSession' | 'onNewSessionInProject' | 'onProjectSettings'
> {
  const navigate = useNavigate();

  return {
    onSelect: (id) => navigate(sessionHref(id)),
    onNewSession: () => navigate(newSessionHref()),
    onNewSessionInProject: (projectId) => navigate(newSessionHref(projectId)),
    onProjectSettings: (name) => navigate(projectHref(name)),
  };
}

function useSessionsViewProps(
  props: LiveSessionListProps,
): SessionListViewProps {
  const { progress: lookupProgress, ...lookups } = useSessionListLookups();
  const { progress: pageProgress, ...pages } = useSessionPages(props);

  return {
    ...props,
    ...lookups,
    ...pages,
    ...useLiveUpdatesStatus(),
    ...useSessionsNavigation(),
    loadState: sessionsLoadState([...lookupProgress, pageProgress]),
  };
}

// The Sessions list: its queries and live updates, passed to the view as props, and the dialog that renames a row's Session.
export function LiveSessionList(
  props: LiveSessionListProps,
): React.JSX.Element {
  const view = useSessionsViewProps(props);
  const rename = useRenameSession(view.sessions);

  return (
    <>
      <SessionListView {...view} onRename={rename.onRename} />
      <RenameSessionDialog {...rename.dialog} />
    </>
  );
}
