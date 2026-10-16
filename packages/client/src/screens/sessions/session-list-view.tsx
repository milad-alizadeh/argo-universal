import type { AgentsListOutput, ProjectsListOutput } from '@repo/contracts';
import type { SessionInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import {
  type SessionsLayout,
  type SessionsLoadState,
  serverSilentMessage,
  newSessionBesideSearch,
  SessionsLoading,
} from '#features/sessions';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { Screen } from '#lib/product/screen/screen';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';
import { FloatingActionButton } from './floating-action-button';
import { SessionsListContent } from './session-list-view-rows';

export interface SessionListViewProps {
  loadState: SessionsLoadState;
  // The live stream failed while the Connection is open.
  liveUpdatesStopped: boolean;
  // Fetching the next page failed; the loaded rows stay.
  loadMoreFailed: boolean;
  isFetchingNextPage: boolean;
  projects: ProjectsListOutput;
  agents: AgentsListOutput;
  sessions: SessionInfo[];
  query: string;
  // The phone's header search and a wide window's title row set it.
  onQueryChange: (query: string) => void;
  archived: boolean;
  // Regular rows, or Compact one-line rows; Regular when unset.
  layout?: SessionsLayout;
  selectedSessionId?: string;
  onSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onNewSessionInProject: (projectId: string) => void;
  onProjectSettings: (projectName: string) => void;
  onLoadMore: () => void;
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

function SessionsContent(props: SessionListViewProps): React.JSX.Element {
  const wide = useWide();
  // A failed first load keeps the loading rows: the toast says why, and the queries retry when the Connection reopens.
  const loading = props.loadState !== 'ready';

  if (wide && loading) return <SessionsLoading layout={props.layout} />;

  return <SessionsListContent {...props} wide={wide} loading={loading} />;
}

// Wide, New Session sits in the header row; on an iOS phone, beside the search bar.
function NewSessionControl({
  onNewSession,
}: Pick<SessionListViewProps, 'onNewSession'>): React.JSX.Element | null {
  const wide = useWide();

  if (wide || newSessionBesideSearch) return null;

  return (
    <View className="absolute bottom-10.5 right-5">
      <FloatingActionButton
        accessibilityLabel="New Session"
        icon="new-session"
        onPress={onNewSession}
      />
    </View>
  );
}

function SessionsLayout(props: SessionListViewProps): React.JSX.Element {
  return (
    <Screen
      edges={['bottom']}
      className="relative flex-1 bg-content wide:bg-transparent"
      style={{ minHeight: 0 }}
    >
      <SessionsContent {...props} />
      <NewSessionControl onNewSession={props.onNewSession} />
    </Screen>
  );
}
