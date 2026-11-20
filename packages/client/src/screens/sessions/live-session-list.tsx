import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { memo, useMemo } from 'react';
import {
  type InstalledAgents,
  loadedAgents,
  useInstalledAgents,
} from '#features/agents';
import { useConnectionState, useTRPC } from '#features/connection';
import { useListedConversation } from '#features/conversation';
import { useOpenPluginPage, useSessionRowPlugins } from '#features/plugins';
import {
  ArchiveSessionAlert,
  liveUpdatesStopped,
  type QueryProgress,
  RenameSessionDialog,
  type SessionsView,
  sessionsLoadState,
} from '#features/sessions';
import { useSessionListUpdates } from '#features/sessions';
import {
  newSessionHref,
  projectHref,
  sessionHref,
} from '#lib/product/navigation/navigation';
import { useNavigateFromShown } from '#lib/product/navigation/use-navigate-from-shown';
import {
  SessionListView,
  type SessionListViewProps,
} from './session-list-view';
import { useArchiveSession } from './use-archive-session';
import { useRenameSession } from './use-rename-session';
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
  const projects = useQuery(trpc.project.list.queryOptions());
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
  const navigate = useNavigateFromShown();

  // Each keeps one identity, so a row redraws only when its own Session changes.
  return useMemo(
    () => ({
      onSelect: (id) => navigate(sessionHref(id)),
      onNewSession: () => navigate(newSessionHref()),
      onNewSessionInProject: (projectId) => navigate(newSessionHref(projectId)),
      onProjectSettings: (name) => navigate(projectHref(name)),
    }),
    [navigate],
  );
}

// What the Plugins add to the drawn rows, and the page an item opens.
function useRowPlugins(
  sessions: SessionListViewProps['sessions'],
): Pick<SessionListViewProps, 'plugins'> {
  const rowPlugins = useSessionRowPlugins(sessions);
  const openPage = useOpenPluginPage();

  return {
    plugins: useMemo(
      () => ({ ...rowPlugins, openPage }),
      [rowPlugins, openPage],
    ),
  };
}

// What the rows carry beyond the Session: the Plugins' items and the live Conversation.
function useRowMarks(
  sessions: SessionListViewProps['sessions'],
): Pick<SessionListViewProps, 'plugins' | 'call'> {
  return { ...useRowPlugins(sessions), call: useListedConversation() };
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
    ...useRowMarks(pages.sessions),
    ...useLiveUpdatesStatus(),
    ...useSessionsNavigation(),
    loadState: sessionsLoadState([...lookupProgress, pageProgress]),
  };
}

// The Sessions list: its queries and live updates, passed to the view as props, the dialog that renames a row's Session, and the phones' alert before archiving one.
export const LiveSessionList = memo(function LiveSessionList(
  props: LiveSessionListProps,
): React.JSX.Element {
  const listView = useSessionsViewProps(props);
  const rename = useRenameSession(listView.sessions);
  const archive = useArchiveSession();
  const actions = listActions(rename, archive);

  return (
    <>
      <SessionListView {...listView} {...actions} />
      <RenameSessionDialog {...rename.dialog} />
      <ArchiveSessionAlert {...archive.alert} />
    </>
  );
});

function listActions(
  rename: ReturnType<typeof useRenameSession>,
  archive: ReturnType<typeof useArchiveSession>,
): Pick<SessionListViewProps, 'onRename' | 'onArchive' | 'onArchiveMany'> {
  return {
    onRename: rename.onRename,
    onArchive: archive.onArchive,
    onArchiveMany: archive.onArchiveMany,
  };
}
