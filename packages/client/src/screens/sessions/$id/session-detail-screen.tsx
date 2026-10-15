import type * as React from 'react';
import { useAgents } from '#features/agents';
import {
  useBlobUrl,
  useConnectionState,
  useResubscribeOnReconnect,
} from '#features/connection';
import { useSessionFeed } from '#features/feed';
import { useSessionElicitation } from '#features/sessions';
import { useNavigate } from '#lib/product/navigation/context';
import { newSessionId } from '#lib/product/navigation/routes';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';
import {
  type SessionDetailViewSources,
  toSessionViewProps,
} from './session-detail-view-props';
import { SessionNewScreen } from './session-new-screen';
import { useSessionCommands } from './use-session-commands';

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

function ConnectedSession({
  sessionId,
}: {
  sessionId: string;
}): React.JSX.Element {
  return <SessionDetailView {...useSessionViewProps(sessionId)} />;
}

// A Session the Server refused to open tries again when the Connection reopens; its toast already said why.
function useRetryOpenOnReconnect(feed: SessionFeed): void {
  useResubscribeOnReconnect({
    status: feed.openError ? 'error' : 'idle',
    reset: feed.retryOpen,
  });
}

function useFeedElicitation(
  sessionId: string,
  feed: SessionFeed,
): SessionDetailViewSources['elicitation'] {
  return useSessionElicitation({
    sessionId,
    request: feed.snapshot?.pendingElicitation,
    resumeAfterCommand: feed.resumeAfterCommand,
  });
}

function useSessionSurroundings(
  sessionId: string,
  feed: SessionFeed,
): Pick<
  SessionDetailViewSources,
  'agents' | 'navigate' | 'imageUrl' | 'connected' | 'elicitation'
> {
  return {
    elicitation: useFeedElicitation(sessionId, feed),
    agents: useAgents(),
    navigate: useNavigate(),
    imageUrl: useBlobUrl(),
    connected: useConnectionState() === 'open',
  };
}

function useSessionViewProps(sessionId: string): SessionDetailViewProps {
  const feed = useSessionFeed(sessionId);

  const commands = useSessionCommands({
    sessionId,
    resumeAfterCommand: feed.resumeAfterCommand,
    agent: feed.snapshot?.agent,
  });

  const surroundings = useSessionSurroundings(sessionId, feed);
  useRetryOpenOnReconnect(feed);

  return toSessionViewProps({ sessionId, feed, commands, ...surroundings });
}
