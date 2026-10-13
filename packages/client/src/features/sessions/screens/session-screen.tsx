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

function useSessionSurroundings(): Pick<
  SessionViewSources,
  'agents' | 'navigate' | 'imageUrl' | 'connected'
> {
  return {
    agents: useAgents(),
    navigate: useNavigate(),
    imageUrl: useBlobUrl(),
    connected: useConnectionState() === 'open',
  };
}

function useSessionViewProps(sessionId: string): SessionViewProps {
  const feed = useSessionFeed(sessionId);
  const commands = useSessionCommands({
    sessionId,
    resumeAfterCommand: feed.resumeAfterCommand,
    agent: feed.snapshot?.agent,
  });
  const surroundings = useSessionSurroundings();
  useRetryOpenOnReconnect(feed);
  return toSessionViewProps({ sessionId, feed, commands, ...surroundings });
}
