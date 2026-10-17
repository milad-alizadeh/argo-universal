import { useIsPreview } from 'expo-router';
import type * as React from 'react';
import { useInstalledAgents } from '#features/agents';
import {
  useBlobUrl,
  useConnectionState,
  useResubscribeOnReconnect,
} from '#features/connection';
import { useSessionFeed } from '#features/feed';
import {
  useCacheSessionOptions,
  useConnectionDropped,
  useMergeMethod,
} from '#features/sessions';
import { useNavigate } from '#lib/product/navigation/navigation';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { newSessionId } from '../../../lib/product/navigation/new-session';
import {
  SessionDetailView,
  type SessionDetailViewProps,
  sessionPageTitle,
} from './session-detail-view';
import {
  type SessionDetailViewSources,
  toSessionViewProps,
} from './session-detail-view-props';
import { SessionNewScreen } from './session-new-screen';
import { useFeedRequests } from './use-feed-requests';
import { useMarkSeen } from './use-mark-seen';
import { useSessionCallout } from './use-session-callout';
import {
  type SessionCommands,
  useSessionCommands,
} from './use-session-commands';

export interface SessionDetailScreenProps {
  id: string;
  // New Session's Project, when it was opened from one.
  projectId?: string;
}

type SessionFeed = ReturnType<typeof useSessionFeed>;

// One Session, or New Session for the id no Session has: the first prompt's hand-off only changes the id, so the route keeps its screen. A new id starts every piece of state over.
export function SessionDetailScreen({
  id,
  projectId,
}: SessionDetailScreenProps): React.JSX.Element {
  if (id === newSessionId) return <SessionNewScreen projectId={projectId} />;

  return <ConnectedSession key={id} sessionId={id} />;
}

// iOS's long-press preview draws the page outside its stack: it takes no header, and a peek does not mark the Session seen.
function ConnectedSession({
  sessionId,
}: {
  sessionId: string;
}): React.JSX.Element {
  const preview = useIsPreview();
  const props = useSessionViewProps({ sessionId, preview });

  if (preview) return <SessionDetailView {...previewed(props)} />;

  return (
    <>
      <ScreenHeader title={sessionPageTitle(props)} />
      <SessionDetailView {...props} />
    </>
  );
}

const previewed = (props: SessionDetailViewProps): SessionDetailViewProps =>
  props.state === 'open' ? { ...props, preview: true } : props;

// A Session the Server refused to open tries again when the Connection reopens; its callout already said why.
function useRetryOpenOnReconnect(feed: SessionFeed): void {
  useResubscribeOnReconnect({
    status: feed.openError ? 'error' : 'idle',
    reset: feed.retryOpen,
  });
}

type SessionSurroundings =
  | 'agents'
  | 'navigate'
  | 'imageUrl'
  | 'connected'
  | 'elicitation'
  | 'permission'
  | 'mergeMethod'
  | 'onAtEndChange';

function useSessionSurroundings(
  { sessionId, preview }: SessionPage,
  feed: SessionFeed,
): Pick<SessionDetailViewSources, SessionSurroundings> {
  return {
    ...useFeedRequests(sessionId, feed),
    agents: useInstalledAgents(),
    navigate: useNavigate(),
    imageUrl: useBlobUrl(),
    connected: useConnectionState() === 'open',
    mergeMethod: useMergeMethod(),
    onAtEndChange: useMarkSeen(sessionId, feed.revision, preview),
  };
}

const useFeedCommands = (
  sessionId: string,
  feed: SessionFeed,
): SessionCommands =>
  useSessionCommands({
    sessionId,
    resumeAfterCommand: feed.resumeAfterCommand,
    agent: feed.snapshot?.agent,
  });

function useFeedUpkeep(feed: SessionFeed): void {
  useRetryOpenOnReconnect(feed);
  useCacheSessionOptions(feed.snapshot);
}

interface ConnectedFeed {
  feed: SessionFeed;
  // The Connection dropped the Feed's open: a toast says why, not a callout.
  feedDropped: boolean;
  commands: SessionCommands;
}

function useConnectedFeed(sessionId: string): ConnectedFeed {
  const feed = useSessionFeed(sessionId);

  return {
    feed,
    feedDropped: useConnectionDropped(feed.openError),
    commands: useFeedCommands(sessionId, feed),
  };
}

// The Session the page draws, and whether it draws as iOS's long-press preview.
interface SessionPage {
  sessionId: string;
  preview: boolean;
}

function useSessionViewProps(page: SessionPage): SessionDetailViewProps {
  const { sessionId } = page;
  const sources = useConnectedFeed(sessionId);
  const surroundings = useSessionSurroundings(page, sources.feed);
  const { agents } = surroundings;
  const callouts = useSessionCallout({ sessionId, agents, ...sources });

  useFeedUpkeep(sources.feed);

  return toSessionViewProps({
    sessionId,
    ...sources,
    callouts,
    ...surroundings,
  });
}
