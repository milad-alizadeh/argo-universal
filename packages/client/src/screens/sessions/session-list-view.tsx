import type { AgentServer, ProjectsListOutput } from '@repo/contracts';
import type { SessionInfo } from '@repo/contracts';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { View } from 'react-native';
import {
  type SessionsLoadState,
  type SessionsView,
  serverSilentMessage,
  SessionsLoading,
} from '#features/sessions';
import { Screen } from '#lib/product/screen/screen';
import { SessionsListContent } from './session-list-view-rows';

export interface SessionListViewProps {
  loadState: SessionsLoadState;
  // The live stream failed while the Connection is open.
  liveUpdatesStopped: boolean;
  // Fetching the next page failed; the loaded rows stay.
  loadMoreFailed: boolean;
  isFetchingNextPage: boolean;
  projects: ProjectsListOutput;
  agents: AgentServer[];
  sessions: SessionInfo[];
  query: string;
  // The phone's header search and a wide window's title row set it.
  onQueryChange: (query: string) => void;
  // How the list orders, groups, filters and lays out its rows.
  view: SessionsView;
  selectedSessionId?: string;
  onSelect: (sessionId: string) => void;
  // Desktop and the web: a row's double-click or context menu asks to rename its Session.
  onRename?: (sessionId: string) => void;
  // Archive in a row's context menu.
  onArchive?: (sessionId: string) => void;
  onNewSession: () => void;
  onNewSessionInProject: (projectId: string) => void;
  onProjectSettings: (projectName: string) => void;
  onLoadMore: () => void;
  onRefresh?: () => Promise<void>;
  onArchiveMany?: (sessionIds: readonly string[]) => void;
}

const loadFailed: ErrorToast = {
  title: "Couldn't load Sessions",
  message: serverSilentMessage,
};

const liveUpdatesFailed: ErrorToast = {
  title: 'Live updates stopped',
  message: 'The Sessions shown may be out of date.',
};

const loadMoreFailedToast: ErrorToast = {
  title: "Couldn't load more Sessions",
  message: 'Scroll to the end of the list to try again.',
};

function toastWhen(failed: boolean, toast: ErrorToast): ErrorToast | undefined {
  return failed ? toast : undefined;
}

// Each failure shows a toast once; the list keeps what it already shows.
function useSessionsErrorToasts(props: SessionListViewProps): void {
  useErrorToast(toastWhen(props.loadState === 'error', loadFailed));
  useErrorToast(toastWhen(props.liveUpdatesStopped, liveUpdatesFailed));
  // Each failed attempt is its own failure: the next page fetches again from the end of the list.
  useErrorToast(
    toastWhen(
      props.loadMoreFailed && !props.isFetchingNextPage,
      loadMoreFailedToast,
    ),
  );
}

// The Sessions list below the Frame's header row: phone full screen, or the wide window's sidebar.
export function SessionListView(
  props: SessionListViewProps,
): React.JSX.Element {
  useSessionsErrorToasts(props);

  return <SessionsLayout {...props} />;
}

/*
 * While loading, a wide sidebar shows the loading rows alone; a phone shows them in the list, under its header.
 * The list stays mounted throughout, hidden on a wide window until it has loaded.
 */
function SessionsContent(props: SessionListViewProps): React.JSX.Element {
  // A failed first load keeps the loading rows: the toast says why, and the queries retry when the Connection reopens.
  const loading = props.loadState !== 'ready';

  return (
    <>
      {loading && <WideLoading layout={props.view.layout} />}
      <View
        className={loading ? 'flex-1 wide:hidden' : 'flex-1'}
        style={fillStyle}
      >
        <SessionsListContent {...props} loading={loading} />
      </View>
    </>
  );
}

function WideLoading(props: Pick<SessionsView, 'layout'>): React.JSX.Element {
  return (
    <SizeClass only="wide">
      <SessionsLoading layout={props.layout} />
    </SizeClass>
  );
}

const fillStyle = { minHeight: 0 };

function SessionsLayout(props: SessionListViewProps): React.JSX.Element {
  return (
    <Screen
      edges={['bottom']}
      className="relative flex-1 bg-content wide:bg-transparent"
      style={fillStyle}
    >
      <SessionsContent {...props} />
    </Screen>
  );
}
