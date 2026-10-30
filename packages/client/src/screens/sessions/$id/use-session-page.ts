import { useInstalledAgents } from '#features/agents';
import { useBlobUrl, useConnectionState } from '#features/connection';
import { useSessionFeed } from '#features/feed';
import { useConnectionDropped, useSessionWork } from '#features/sessions';
import { useNavigate } from '#lib/product/navigation/navigation';
import { renderSubagentFeed } from './connected-subagent-feed';
import type { SessionPluginCard } from './sections/plugin-card-section';
import type { SessionDetailViewProps } from './session-detail-view';
import {
  type SessionDetailViewSources,
  toSessionViewProps,
} from './session-detail-view-props';
import { offeredWith, withPluginCards } from './session-plugin-cards';
import { useFeedRequests } from './use-feed-requests';
import { useMarkSeen } from './use-mark-seen';
import { useSessionCallout } from './use-session-callout';
import { useChangedSession } from './use-session-changes';
import {
  type SessionCommands,
  useSessionCommands,
} from './use-session-commands';
import { useSessionReadOptions } from './use-session-read-options';
import { useWithSessionBar } from './use-with-session-bar';
import { type WorkbenchCards, useWorkbenchCards } from './use-workbench-cards';

type SessionFeed = ReturnType<typeof useSessionFeed>;

// The Session the page draws, and whether it draws as iOS's long-press preview.
export interface SessionPage {
  sessionId: string;
  preview: boolean;
}

// What the page draws, and the Plugin cards in it, which its header toggles.
export interface OpenedSession {
  props: SessionDetailViewProps;
  cards: WorkbenchCards;
}

// Everything one Session page reads, with the Plugin cards it has open folded into its props (ADR-0035).
export function useSessionPage(page: SessionPage): OpenedSession {
  const cards = useWorkbenchCards(page.sessionId);

  return { props: useSessionViewProps(page, cards.open), cards };
}

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
  cards: readonly SessionPluginCard[],
  feed: SessionFeed,
): Pick<SessionDetailViewSources, SessionSurroundings> {
  return {
    ...useFeedRequests(sessionId, feed),
    ...useSessionWork(sessionId, feed.snapshot, offeredWith(cards)),
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

function useSessionViewProps(
  page: SessionPage,
  cards: readonly SessionPluginCard[],
): SessionDetailViewProps {
  const { sessionId } = page;
  const sources = useConnectedFeed(sessionId);
  const surroundings = useSessionSurroundings(page, cards, sources.feed);
  const reads = usePageCallout(sessionId, sources, surroundings.agents);
  const props = pageProps(sessionId, sources, { ...surroundings, ...reads });
  const changed = useChangedSession(sessionId, props, sources.feed);
  const bar = useWithSessionBar(sessionId, sources.feed, changed);

  return withPluginCards(withAgentFeed(bar), cards);
}

// What the view draws, from the Session's own sources and everything the page read around it.
const pageProps = (
  sessionId: string,
  sources: ConnectedFeed,
  around: Pick<
    SessionDetailViewSources,
    SessionSurroundings | 'options' | 'callouts'
  >,
): SessionDetailViewProps =>
  toSessionViewProps({ sessionId, ...sources, ...around });

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
