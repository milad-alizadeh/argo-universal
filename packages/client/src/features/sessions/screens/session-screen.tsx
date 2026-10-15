import type * as React from 'react';
import { useAgents } from '#features/agents';
import {
  useBlobUrl,
  useConnectionState,
  useResubscribeOnReconnect,
} from '#features/connection';
import { useSessionFeed } from '#features/feed';
import { useNavigate } from '#lib/product/navigation/context';
import {
  SessionView,
  type SessionViewProps,
} from '../components/session-view/session-view';
import { useMergeMethod } from '../hooks/use-merge-method';
import { useSessionElicitation } from '../hooks/use-session-elicitation';
import {
  type SessionViewSources,
  toSessionViewProps,
} from './session-view-props';
import { useSessionCommands } from './use-session-commands';

export interface SessionScreenProps {
  id: string;
}

type SessionFeed = ReturnType<typeof useSessionFeed>;

// One Session. A new id starts every piece of state over.
export function SessionScreen({ id }: SessionScreenProps): React.JSX.Element {
  return <ConnectedSession key={id} sessionId={id} />;
}

function ConnectedSession({
  sessionId,
}: {
  sessionId: string;
}): React.JSX.Element {
  return <SessionView {...useSessionViewProps(sessionId)} />;
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
): SessionViewSources['elicitation'] {
  return useSessionElicitation({
    sessionId,
    request: feed.snapshot?.pendingElicitation,
    resumeAfterCommand: feed.resumeAfterCommand,
  });
}

type SessionSurroundings =
  | 'agents'
  | 'navigate'
  | 'imageUrl'
  | 'connected'
  | 'elicitation'
  | 'mergeMethod';

function useSessionSurroundings(
  sessionId: string,
  feed: SessionFeed,
): Pick<SessionViewSources, SessionSurroundings> {
  return {
    elicitation: useFeedElicitation(sessionId, feed),
    agents: useAgents(),
    navigate: useNavigate(),
    imageUrl: useBlobUrl(),
    connected: useConnectionState() === 'open',
    mergeMethod: useMergeMethod(),
  };
}

function useSessionViewProps(sessionId: string): SessionViewProps {
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
