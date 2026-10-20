import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import {
  type InstalledAgents,
  loadedAgents,
  useInstalledAgents,
} from '#features/agents';
import { useConnectionState, useTRPC } from '#features/connection';
import {
  ArchiveSessionAlert,
  type QueryProgress,
  RenameSessionDialog,
  type SessionsView,
  sessionsLoadState,
} from '#features/session-list';
import { liveUpdatesStopped } from '#features/sessions';
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
import { useArchiveSession } from './use-archive-session';
import { useRenameSession } from './use-rename-session';
import { useSessionListUpdates } from './use-session-list-updates';
import { useSessionPages } from './use-session-pages';

export interface LiveSessionListProps {
  query: string;
  onQueryChange: (query: string) => void;
  // How the list orders, groups, filters and lays out its rows.
  view: SessionsView;
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

const agentsProgress = ({ status }: InstalledAgents): QueryProgress => ({
  failed: status === 'failed',
  pending: status === 'loading',
});

// The Projects and Installed Agents each Session row is drawn with.
function useSessionListLookups(): SessionListLookups {
  const trpc = useTRPC();
  const projects = useQuery(trpc.projects.list.queryOptions());
  const agents = useInstalledAgents();

  return {
    projects: projects.data ?? [],
    agents: loadedAgents(agents),
    progress: [queryProgress(projects), agentsProgress(agents)],
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

// The Sessions list: its queries and live updates, passed to the view as props, the dialog that renames a row's Session, and the phones' alert before archiving one.
export function LiveSessionList(
  props: LiveSessionListProps,
): React.JSX.Element {
  const listView = useSessionsViewProps(props);
  const rename = useRenameSession(listView.sessions);
  const archive = useArchiveSession();
  const actions = { onRename: rename.onRename, onArchive: archive.onArchive };

  return (
    <>
      <SessionListView {...listView} {...actions} />
      <RenameSessionDialog {...rename.dialog} />
      <ArchiveSessionAlert {...archive.alert} />
    </>
  );
}
