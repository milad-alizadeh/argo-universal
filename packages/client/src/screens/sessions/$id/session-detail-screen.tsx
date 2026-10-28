import { useIsPreview } from 'expo-router';
import type * as React from 'react';
import { useInstalledAgents } from '#features/agents';
import { useBlobUrl, useConnectionState } from '#features/connection';
import { useSessionFeed } from '#features/feed';
import { useConnectionDropped, useSessionWork } from '#features/sessions';
import { useNavigate } from '#lib/product/navigation/navigation';
import { newSessionId } from '../../../lib/product/navigation/new-session';
import { ReplaceableSlotRenderer } from '../../../lib/product/plugin-registry';
import { renderConnectedReplaceableSlot } from '../../plugins/connected-replaceable-slot';
import { renderSubagentFeed } from './connected-subagent-feed';
import { offeredSections } from './sections/session-sections';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';
import {
  type SessionDetailViewSources,
  toSessionViewProps,
} from './session-detail-view-props';
import { SessionNewScreen } from './session-new-screen';
import { ConnectedSessionHeader } from './session-page-header';
import { useSessionPageMenu } from './session-page-menu';
import { useFeedRequests } from './use-feed-requests';
import { useMarkSeen } from './use-mark-seen';
import { useSessionCallout } from './use-session-callout';
import { useChangedSession } from './use-session-changes';
import {
  type SessionCommands,
  useSessionCommands,
} from './use-session-commands';
import { useSessionReadOptions } from './use-session-read-options';

export interface SessionDetailScreenProps {
  id: string;
  // New Session's Project, when it was opened from one.
  projectId?: string;
  // New Session's Composer text, when a Plugin opened it with one.
  draft?: string;
}

type SessionFeed = ReturnType<typeof useSessionFeed>;

// One Session, or New Session for the id no Session has: the first prompt's hand-off only changes the id, so the route keeps its screen. A new id starts every piece of state over.
export function SessionDetailScreen({
  id,
  projectId,
  draft,
}: SessionDetailScreenProps): React.JSX.Element {
  return (
    <ReplaceableSlotRenderer value={renderConnectedReplaceableSlot}>
      {id === newSessionId ? (
        <SessionNewScreen projectId={projectId} draft={draft} />
      ) : (
        <ConnectedSession key={id} sessionId={id} />
      )}
    </ReplaceableSlotRenderer>
  );
}

// iOS's long-press preview draws the page outside its stack: it takes no header, and a peek does not mark the Session seen.
function ConnectedSession({
  sessionId,
}: Pick<SessionPage, 'sessionId'>): React.JSX.Element {
  const preview = useIsPreview();
  const opened = useSessionViewProps({ sessionId, preview });
  const { props, dialogs } = useSessionPageMenu(sessionId, opened);

  if (preview) return <SessionDetailView {...previewed(props)} />;

  return (
    <>
      <ConnectedSessionHeader sessionId={sessionId} {...props} />
      <SessionDetailView {...props} />
      {dialogs}
    </>
  );
}

const previewed = (props: SessionDetailViewProps): SessionDetailViewProps =>
  props.state === 'open' ? { ...props, preview: true } : props;

type SessionSurroundings =
  | 'agents'
  | 'navigate'
  | 'imageUrl'
  | 'connected'
  | 'elicitation'
  | 'permission'
  | 'onAtEndChange'
  | 'shells'
  | 'inspectorPanels';

function useSessionSurroundings(
  { sessionId, preview }: SessionPage,
  feed: SessionFeed,
): Pick<SessionDetailViewSources, SessionSurroundings> {
  return {
    ...useFeedRequests(sessionId, feed),
    ...useSessionWork(sessionId, feed.snapshot, offeredSections),
    agents: useInstalledAgents(),
    navigate: useNavigate(),
    imageUrl: useBlobUrl(),
    connected: useConnectionState() === 'open',
    onAtEndChange: useMarkSeen(sessionId, feed.revision, preview),
  };
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
    commands: useSessionCommands({
      sessionId,
      resumeAfterCommand: feed.resumeAfterCommand,
      agent: feed.snapshot?.agent,
    }),
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
  const reads = usePageCallout(sessionId, sources, surroundings.agents);

  const props = toSessionViewProps({
    sessionId,
    ...sources,
    ...surroundings,
    ...reads,
  });

  return withAgentFeed(useChangedSession(sessionId, props, sources.feed));
}

function usePageCallout(
  sessionId: string,
  sources: ConnectedFeed,
  agents: SessionDetailViewSources['agents'],
): Pick<SessionDetailViewSources, 'options' | 'callouts'> {
  const options = useSessionReadOptions(sessionId, sources.feed);

  const callouts = useSessionCallout({
    sessionId,
    agents,
    discovery: options,
    ...sources,
  });

  return { options, callouts };
}

const withAgentFeed = (
  props: SessionDetailViewProps,
): SessionDetailViewProps =>
  props.state === 'open' ? { ...props, renderSubagentFeed } : props;
