import { useQuery, useQueryClient } from '@tanstack/react-query';
import type * as React from 'react';
import { memo, useEffect, useMemo } from 'react';
import { loadedAgents, useInstalledAgents } from '#features/agents';
import {
  useConnectionState,
  useTRPC,
  useTRPCClient,
} from '#features/connection';
import {
  MiniConversationBand,
  useListedConversation,
} from '#features/conversation';
import { useOpenPluginPage, useSessionRowPlugins } from '#features/plugins';
import {
  ArchiveSessionAlert,
  liveUpdatesStopped,
  type QueryProgress,
  RenameSessionDialog,
  type SessionRowCall,
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

// The Projects and Installed Agents each Session row is drawn with. The list waits for the Projects, which group its rows; a row whose Agent has not loaded draws without its logo, which fills in when the Agents arrive.
function useSessionListLookups(
  sessions: SessionListViewProps['sessions'],
): SessionListLookups {
  const trpc = useTRPC();
  const projects = useQuery(trpc.project.list.queryOptions());
  const agents = useInstalledAgents();

  useProjectsReadForUnlistedSessions(projects.data, sessions);

  return {
    projects: projects.data ?? [],
    agents: loadedAgents(agents),
    progress: [queryProgress(projects)],
  };
}

/*
 * Only the App's own adds refresh the kept Projects, so one added elsewhere (an Agent's `project.add`, `project.clone` or `project.create` Operation, the CLI, another App) is missing from them, and the list cannot draw a Session started in it.
 * Such a Session asks for the Projects again. The Projects the kept list lacks are keyed as one string, so each set of them asks once and a Session whose Project is gone does not ask on every change.
 */
function useProjectsReadForUnlistedSessions(
  projects: SessionListViewProps['projects'] | undefined,
  sessions: SessionListViewProps['sessions'],
): void {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const unlistedKey = useMemo((): string => {
    if (!projects) return '';

    const listed = new Set(projects.map(({ id }) => id));

    return [
      ...new Set(
        sessions
          .map(({ projectId }) => projectId)
          .filter((projectId) => !listed.has(projectId)),
      ),
    ]
      .sort()
      .join('\n');
  }, [projects, sessions]);

  useEffect(() => {
    if (unlistedKey)
      void queryClient.invalidateQueries(trpc.project.list.queryFilter());
  }, [unlistedKey, queryClient, trpc]);
}

// Live updates start once the list holds rows, from the Device or the Server, for them to land on.
function useLiveUpdatesStatus(
  listed: boolean,
): Pick<SessionListViewProps, 'liveUpdatesStopped'> {
  const listUpdates = useSessionListUpdates(listed);
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
  const client = useTRPCClient();

  // Each keeps one identity, so a row redraws only when its own Session changes.
  return useMemo(
    () => ({
      onSelect: (id) => {
        navigate(sessionHref(id));
        // Selecting a row explicitly opens the Session and starts opted-in Runs.
        void client.session.open.mutate({ sessionId: id }).catch(() => {});
      },
      onNewSession: () => navigate(newSessionHref()),
      onNewSessionInProject: (projectId) => navigate(newSessionHref(projectId)),
      onProjectSettings: (name) => navigate(projectHref(name)),
    }),
    [client, navigate],
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

function useRowCall(): SessionRowCall | null {
  const call = useListedConversation();

  return useMemo(() => {
    if (!call) return null;

    const { band, sessionId, startedAt } = call;

    return {
      sessionId,
      startedAt,
      muted: band.call.microphoneMuted,
      indicator: <MiniConversationBand {...band} />,
    };
  }, [call]);
}

// What the rows carry beyond the Session: the Plugins' items and the live Conversation.
function useRowMarks(
  sessions: SessionListViewProps['sessions'],
): Pick<SessionListViewProps, 'plugins' | 'call'> {
  return { ...useRowPlugins(sessions), call: useRowCall() };
}

function useSessionsViewProps(
  props: LiveSessionListProps,
): SessionListViewProps {
  const { progress: pageProgress, ...pages } = useSessionPages(props);
  const { progress: lookupProgress, ...lookups } = useSessionListLookups(
    pages.sessions,
  );

  return {
    ...props,
    ...lookups,
    ...pages,
    ...useRowMarks(pages.sessions),
    ...useLiveUpdatesStatus(!pageProgress.pending),
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
