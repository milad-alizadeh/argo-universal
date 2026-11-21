import { RetainedPageVisibility } from '@repo/kit/use-shown-page';
import { use } from 'react';
import { useInstalledAgents } from '#features/agents';
import { useBlobUrl } from '#features/connection';
import { useSessionWork } from '#features/sessions';
import { useNavigateFromShown } from '#lib/product/navigation/use-navigate-from-shown';
import { renderSubagentFeed } from './connected-subagent-feed';
import type { SessionPluginCard } from './sections/plugin-card-section';
import type { SessionDetailViewProps } from './session-detail-view';
import {
  type SessionDetailViewSources,
  toSessionViewProps,
} from './session-detail-view-props';
import { offeredWith, withPluginCards } from './session-plugin-cards';
import { useConnectedFeed, type ConnectedFeed } from './use-connected-feed';
import { useFeedRequests } from './use-feed-requests';
import { useMarkSeen } from './use-mark-seen';
import { useSessionCallout } from './use-session-callout';
import { useChangedSession } from './use-session-changes';
import { useSessionLink } from './use-session-link';
import { useSessionReadOptions } from './use-session-read-options';
import { useWithSessionBar } from './use-with-session-bar';
import { useWithSessionPullRequests } from './use-with-session-pull-requests';
import {
  type CardSession,
  type WorkbenchCards,
  useWorkbenchCards,
} from './use-workbench-cards';

// The Session the page draws, and whether it draws as iOS's long-press preview.
export interface SessionPage {
  sessionId: string;
  preview: boolean;
}

// What the page draws, the Plugin cards in it, which its header toggles, and the Session and Project they draw for.
export interface OpenedSession {
  props: SessionDetailViewProps;
  cards: WorkbenchCards;
  session: CardSession;
}

// Everything one Session page reads, with the Plugin cards it has open folded into its props (ADR-0035).
export function useSessionPage(page: SessionPage): OpenedSession {
  // A retained page its Session list hides keeps what it holds and does none of its live work.
  const shown = use(RetainedPageVisibility);
  const sources = useConnectedFeed(page.sessionId, shown);

  const session = {
    sessionId: page.sessionId,
    projectId: sources.feed.snapshot?.projectId,
  };

  const cards = useWorkbenchCards(session);

  return {
    props: useSessionViewProps(page, cards.open, sources),
    cards,
    session,
  };
}

type SessionSurroundings =
  | 'agents'
  | 'navigate'
  | 'imageUrl'
  | keyof ReturnType<typeof useSessionLink>
  | 'elicitation'
  | 'permission'
  | 'onAtEndChange'
  | 'shells'
  | 'inspectorPanels';

function useSessionSurroundings(
  { sessionId, preview }: SessionPage,
  offered: ReturnType<typeof offeredWith>,
  { feed }: ConnectedFeed,
): Pick<SessionDetailViewSources, SessionSurroundings> {
  return {
    ...useFeedRequests(sessionId, feed),
    ...useSessionWork(sessionId, feed.snapshot, offered),
    agents: useInstalledAgents(),
    navigate: useNavigateFromShown(),
    imageUrl: useBlobUrl(),
    ...useSessionLink({ sessionId, resumeFeed: feed.resumeAfterCommand }),
    onAtEndChange: useMarkSeen(sessionId, feed.revision, preview),
  };
}

function useSessionViewProps(
  page: SessionPage,
  cards: readonly SessionPluginCard[],
  sources: ConnectedFeed,
): SessionDetailViewProps {
  const { sessionId } = page;

  const props = usePageProps(page, cards, sources);
  const changed = useChangedSession({ sessionId, props, feed: sources.feed });
  const bar = useWithSessionBar(sessionId, sources.feed, changed);
  const changes = useWithSessionPullRequests(sessionId, sources.feed, bar);

  const schedules = hasFollowUps(sources.schedules)
    ? sources.schedules
    : undefined;

  return withPluginCards(withAgentFeed(changes), cards, schedules);
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

const hasFollowUps = (schedules: ConnectedFeed['schedules']): boolean =>
  schedules.canCreate || schedules.items.length > 0;

function usePageProps(
  page: SessionPage,
  cards: readonly SessionPluginCard[],
  sources: ConnectedFeed,
): SessionDetailViewProps {
  const { sessionId } = page;

  const surroundings = useSessionSurroundings(
    page,
    offeredWith(cards, hasFollowUps(sources.schedules)),
    sources,
  );

  const reads = usePageCallout(sessionId, sources, surroundings.agents);

  return pageProps(sessionId, sources, { ...surroundings, ...reads });
}
