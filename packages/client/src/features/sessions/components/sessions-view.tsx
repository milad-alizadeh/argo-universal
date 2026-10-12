import type { AgentsListOutput, ProjectsListOutput } from '@repo/contracts';
import type { SessionInfo } from '@repo/contracts';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ConnectionBanner, type ConnectionState } from '#features/connection';
import { Screen } from '#lib/product/screen';
import { type ErrorToast, useErrorToast } from '#primitives/toast';
import { useWide } from '../../../lib/generic/use-wide';
import type { SessionsLoadState } from '../state/sessions-load-state';
import { FloatingActionButton } from './floating-action-button';
import { newSessionBesideSearch } from './sessions-header';
import { SessionsList } from './sessions-list';
import { SessionsLoading } from './sessions-loading';

export interface SessionsViewProps {
  loadState: SessionsLoadState;
  connection: ConnectionState;
  // The live stream failed while the Connection is open.
  liveUpdatesStopped: boolean;
  // Fetching the next page failed; the loaded rows stay.
  loadMoreFailed: boolean;
  isFetchingNextPage: boolean;
  projects: ProjectsListOutput;
  agents: AgentsListOutput;
  sessions: SessionInfo[];
  query: string;
  archived: boolean;
  selectedSessionId?: string;
  onSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onNewSessionInProject: (projectId: string) => void;
  onProjectSettings: (projectName: string) => void;
  onLoadMore: () => void;
}

const loadFailed: ErrorToast = {
  title: "Couldn't load Sessions",
  message: "The Server didn't respond. Check that it's running.",
};
const liveUpdatesFailed: ErrorToast = {
  title: 'Live updates stopped',
  message: 'The Sessions shown may be out of date.',
};
const loadMoreFailedToast: ErrorToast = {
  title: "Couldn't load more Sessions",
  message: 'Scroll to the end of the list to try again.',
};

// Each failure shows a toast once; the list keeps what it already shows.
function useSessionsErrorToasts(props: SessionsViewProps): void {
  useErrorToast(props.loadState === 'error' ? loadFailed : undefined);
  useErrorToast(props.liveUpdatesStopped ? liveUpdatesFailed : undefined);
  // Each failed attempt is its own failure: the next page fetches again from the end of the list.
  useErrorToast(
    props.loadMoreFailed && !props.isFetchingNextPage
      ? loadMoreFailedToast
      : undefined,
  );
}

// The Sessions list below the shell's header row: phone full screen, or the wide window's sidebar.
export function SessionsView(props: SessionsViewProps): React.JSX.Element {
  useSessionsErrorToasts(props);
  return <SessionsLayout {...props} />;
}

function SessionsLayout({
  loadState,
  connection,
  isFetchingNextPage,
  projects,
  agents,
  sessions,
  query,
  archived,
  selectedSessionId,
  onSelect,
  onNewSession,
  onNewSessionInProject,
  onProjectSettings,
  onLoadMore,
}: SessionsViewProps): React.JSX.Element {
  const wide = useWide();
  const listTop = <ConnectionBanner state={connection} />;
  // A failed first load keeps the loading rows: the toast says why, and the queries retry when the Connection reopens.
  const placeholder = loadState === 'ready' ? undefined : <SessionsLoading />;

  const sessionContent =
    wide && placeholder ? (
      placeholder
    ) : (
      <SessionsList
        projects={projects}
        agents={agents}
        sessions={sessions}
        isFetchingNextPage={isFetchingNextPage}
        query={query}
        archived={archived}
        selectedSessionId={selectedSessionId}
        onNewSession={onNewSessionInProject}
        onProjectSettings={onProjectSettings}
        onSelect={onSelect}
        onEndReached={onLoadMore}
        // On a phone the rows scroll under the header, so what sits above them scrolls too.
        header={
          wide ? undefined : <View className="-mx-2 -mt-5">{listTop}</View>
        }
        // The list insets it below a transparent header, as it does the rows.
        placeholder={
          placeholder && <View className="-mx-2">{placeholder}</View>
        }
      />
    );

  // Wide, New Session sits in the header row; on an iOS phone, beside the search bar.
  const newSessionControl: ReactNode =
    wide || newSessionBesideSearch ? null : (
      <View className="absolute bottom-[42px] right-5">
        <FloatingActionButton
          accessibilityLabel="New Session"
          icon="new-session"
          onPress={onNewSession}
        />
      </View>
    );

  return (
    <Screen
      edges={['bottom']}
      className="relative flex-1 bg-background wide:bg-transparent"
      style={{ minHeight: 0 }}
    >
      {wide && listTop}
      {sessionContent}
      {newSessionControl}
    </Screen>
  );
}
