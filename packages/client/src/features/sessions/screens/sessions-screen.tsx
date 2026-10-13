import { useQuery } from '@tanstack/react-query';
import type * as React from 'react';
import { useConnectionState, useTRPC } from '#features/connection';
import { useNavigate } from '#lib/product/navigation/context';
import {
  SessionsView,
  type SessionsViewProps,
} from '../components/sessions-view/sessions-view';
import { liveUpdatesStopped } from '../state/live-updates-stopped';
import {
  type QueryProgress,
  sessionsLoadState,
} from '../state/sessions-load-state';
import { useSessionListUpdates } from './use-session-list-updates';
import { useSessionPages } from './use-session-pages';

export interface SessionsScreenProps {
  query: string;
  onQueryChange: (query: string) => void;
  archived: boolean;
  // The open Session, which the wide sidebar marks.
  selectedSessionId?: string;
}

type SessionListLookups = Pick<SessionsViewProps, 'projects' | 'agents'> & {
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
  const agents = useQuery(trpc.agents.list.queryOptions());
  return {
    projects: projects.data ?? [],
    agents: agents.data ?? [],
    progress: [queryProgress(projects), queryProgress(agents)],
  };
}

function useLiveUpdatesStatus(): Pick<
  SessionsViewProps,
  'connection' | 'liveUpdatesStopped'
> {
  const listUpdates = useSessionListUpdates();
  const connection = useConnectionState();
  return {
    connection,
    liveUpdatesStopped: liveUpdatesStopped(listUpdates.status, connection),
  };
}

function useSessionsNavigation(): Pick<
  SessionsViewProps,
  'onSelect' | 'onNewSession' | 'onNewSessionInProject' | 'onProjectSettings'
> {
  const navigate = useNavigate();
  return {
    onSelect: (id) => navigate({ to: 'session', id }),
    onNewSession: () => navigate({ to: 'new-session' }),
    onNewSessionInProject: (projectId) =>
      navigate({ to: 'new-session', projectId }),
    onProjectSettings: (name) => navigate({ to: 'settings-project', name }),
  };
}

function useSessionsViewProps(props: SessionsScreenProps): SessionsViewProps {
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

// The Sessions list: its queries and live updates, passed to the view as props.
export function SessionsScreen(props: SessionsScreenProps): React.JSX.Element {
  return <SessionsView {...useSessionsViewProps(props)} />;
}
