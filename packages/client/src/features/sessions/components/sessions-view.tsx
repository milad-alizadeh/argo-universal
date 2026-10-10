import type { AgentsListOutput, ProjectsListOutput } from '@repo/contracts';
import type { SessionInfo } from '@repo/contracts';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConnectionBanner, type ConnectionState } from '#features/connection';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';
import { LoadError } from '#lib/product/load-error';
import { Screen } from '#lib/product/screen';
import { Icon } from '../../../lib/generic/symbols/icon';
import { useWide } from '../../../lib/generic/use-wide';
import type { SessionsLoadState } from '../state/sessions-load-state';
import { FloatingActionButton } from './floating-action-button';
import { newSessionInHeader } from './sessions-header';
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
  onSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onNewSessionInProject: (projectId: string) => void;
  onProjectSettings: (projectName: string) => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onRetryLiveUpdates: () => void;
  onRetryLoadMore: () => void;
}

// The Sessions list below the shell's header row: phone full screen, or the wide window's sidebar.
export function SessionsView({
  loadState,
  connection,
  liveUpdatesStopped,
  loadMoreFailed,
  isFetchingNextPage,
  projects,
  agents,
  sessions,
  query,
  archived,
  onSelect,
  onNewSession,
  onNewSessionInProject,
  onProjectSettings,
  onLoadMore,
  onRetry,
  onRetryLiveUpdates,
  onRetryLoadMore,
}: SessionsViewProps): React.JSX.Element {
  const wide = useWide();
  const listTop = (
    <>
      <ConnectionBanner state={connection} />
      {liveUpdatesStopped && (
        <LoadError
          title="Live updates stopped"
          description="The Sessions shown may be out of date."
          onRetry={onRetryLiveUpdates}
        />
      )}
      <Text
        role="secondary"
        className="pl-gutter pr-3 py-1.5 wide:py-2 wide:pl-4.5"
      >
        Projects
      </Text>
    </>
  );

  let sessionContent: ReactNode;
  if (loadState === 'error') {
    sessionContent = (
      <BelowHeader>
        {!wide && listTop}
        <LoadError
          title="Couldn't load Sessions"
          description="The Server didn't respond. Check that it's running, then retry."
          onRetry={onRetry}
        />
      </BelowHeader>
    );
  } else if (loadState === 'loading') {
    sessionContent = (
      <BelowHeader>
        {!wide && listTop}
        <SessionsLoading />
      </BelowHeader>
    );
  } else {
    sessionContent = (
      <SessionsList
        projects={projects}
        agents={agents}
        sessions={sessions}
        isFetchingNextPage={isFetchingNextPage}
        query={query}
        archived={archived}
        onNewSession={onNewSessionInProject}
        onProjectSettings={onProjectSettings}
        onSelect={onSelect}
        onEndReached={onLoadMore}
        // On a phone the rows scroll under the header, so what sits above them scrolls too.
        header={
          wide ? undefined : (
            <View className="-mx-gutter-list -mt-5">{listTop}</View>
          )
        }
      />
    );
  }

  let newSessionControl: ReactNode;
  if (wide) {
    newSessionControl = (
      <View className="h-16 justify-center px-3">
        <Button
          accessibilityLabel="New Session"
          onPress={onNewSession}
          className="h-9 sm:h-9 self-start flex-row gap-2 rounded-md px-3"
        >
          <Icon name="new-session" className="text-primary-foreground" />
          <Text role="control" className="text-primary-foreground">
            New Session
          </Text>
        </Button>
      </View>
    );
  } else if (newSessionInHeader) {
    newSessionControl = null;
  } else {
    newSessionControl = (
      <View className="absolute bottom-6 right-4">
        <FloatingActionButton
          accessibilityLabel="New Session"
          icon="new-session"
          onPress={onNewSession}
        />
      </View>
    );
  }

  return (
    <Screen
      edges={['bottom']}
      className="relative flex-1 bg-background wide:bg-sidebar"
      style={{ minHeight: 0 }}
    >
      {wide && listTop}
      {sessionContent}
      {loadMoreFailed && (
        <LoadError
          title="Couldn't load more Sessions"
          description="Try loading the next page again."
          onRetry={onRetryLoadMore}
        />
      )}
      {newSessionControl}
    </Screen>
  );
}

// Keeps content that doesn't scroll out from under a transparent header.
function BelowHeader({ children }: { children: ReactNode }): ReactNode {
  const wide = useWide();
  if (!hasLiquidGlass || wide) return children;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, minHeight: 0 }}>
      {children}
    </SafeAreaView>
  );
}
