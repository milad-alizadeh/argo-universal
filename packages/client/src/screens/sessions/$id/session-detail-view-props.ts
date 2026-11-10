import type { FeedProps, useSessionFeed } from '#features/feed';
import {
  openFailureText,
  sessionMissing,
  type ShellPanelProps,
  type SessionPanels,
} from '#features/sessions';
import type { SessionCallouts } from '#features/sessions';
import { leaveForSessions } from '#lib/product/navigation/navigation';
import {
  type OpenSession,
  sessionComposerProps,
} from './session-composer-props';
import type {
  OpenSessionViewProps,
  SessionDetailViewProps,
} from './session-detail-view';
import { sessionHeaderProps } from './session-header-props-source';
import { type StoppedTurn, stoppedTurn } from './stopped-turn';

type SessionFeed = ReturnType<typeof useSessionFeed>;

type OpenFeed = Pick<OpenSession, 'snapshot' | 'view'>;

export type SessionDetailViewSources = Omit<
  OpenSession,
  'snapshot' | 'view'
> & {
  callouts: SessionCallouts;
  shells: ShellPanelProps;
  inspectorPanels: SessionPanels;
  // The Connection dropped the Feed's open: the page keeps opening, and a toast says why.
  feedDropped: boolean;
};

type OpenSessionSources = OpenSession &
  Pick<SessionDetailViewSources, 'callouts' | 'shells' | 'inspectorPanels'>;

type FeedFailure = Pick<SessionDetailViewSources, 'feed' | 'feedDropped'>;

// A failed first page refetches by itself when the Connection reopens or the window regains focus. An open Session keeps its Feed and Composer when its Agent fails: the callout says why.
function failedSession(
  failure: FeedFailure,
  opened: OpenFeed | undefined,
): SessionDetailViewProps | undefined {
  if (failure.feed.error) return failedRead(failure.feed.error);

  return opened ? undefined : unopened(failure);
}

// The Server named no Session by the id, or never answered the read.
const failedRead = (
  error: NonNullable<SessionFeed['error']>,
): SessionDetailViewProps =>
  sessionMissing(error)
    ? { state: 'missing', onLeave: leaveForSessions }
    : { state: 'failed' };

// An open the Agent refused fails the page with its reason; one the Connection dropped keeps opening, and a toast says why.
function unopened({
  feed,
  feedDropped,
}: FeedFailure): SessionDetailViewProps | undefined {
  const reason = feedDropped ? undefined : openFailureText(feed.openError);

  return reason === undefined ? undefined : { state: 'failed', reason };
}

const loadedFeed = ({ snapshot, view }: SessionFeed): OpenFeed | undefined =>
  snapshot && view ? { snapshot, view } : undefined;

const openFeed = (feed: SessionFeed): OpenFeed | undefined =>
  feed.ready ? loadedFeed(feed) : undefined;

const pagingProps = (
  feed: SessionFeed,
): Pick<
  FeedProps,
  'loadingOlder' | 'hasOlder' | 'historyCursor' | 'onStartReached'
> => ({
  loadingOlder: feed.loadingOlder,
  hasOlder: feed.hasOlder,
  historyCursor: feed.historyCursor,
  onStartReached: (): void => void feed.loadOlder(),
});

const sessionFeedProps = (
  open: OpenSession,
  stoppedEnding: StoppedTurn['ending'] | undefined,
): FeedProps => ({
  sessionId: open.sessionId,
  items: open.view.items.filter((item) => item !== stoppedEnding),
  liveHeader: open.snapshot.liveHeader,
  liveToolCall: open.feed.liveToolCall,
  ...pagingProps(open.feed),
  imageUrl: open.imageUrl,
  checkoutBranch: open.snapshot.checkout.branch ?? undefined,
  onAtEndChange: open.onAtEndChange,
});

const canRetry = (open: OpenSessionSources): boolean =>
  [
    open.connected,
    open.snapshot.state === 'idle',
    open.snapshot.archivedAt === null,
    // Sign-in and launch trouble goes first: until it clears, a retried Turn could not run.
    !open.callouts.callout,
  ].every(Boolean);

const retryableTurn = (open: OpenSessionSources): StoppedTurn | undefined =>
  canRetry(open) ? stoppedTurn(open.view.items) : undefined;

const stoppedTurnProps = (
  open: OpenSession,
  { ending, prompt }: StoppedTurn,
): OpenSessionViewProps['stoppedTurn'] => ({
  reason: ending.end.error?.message,
  onRetry: () => open.commands.retryPrompt(prompt),
});

// The card above the Composer says how the Turn ended, so the Feed leaves its own line out.
function feedAndStoppedTurn(
  open: OpenSessionSources,
): Pick<OpenSessionViewProps, 'feed' | 'stoppedTurn'> {
  const stopped = retryableTurn(open);

  return {
    feed: sessionFeedProps(open, stopped?.ending),
    stoppedTurn: stopped && stoppedTurnProps(open, stopped),
  };
}

const openSessionProps = (open: OpenSessionSources): OpenSessionViewProps => ({
  ...open.callouts,
  ...feedAndStoppedTurn(open),
  elicitation: open.elicitation,
  header: sessionHeaderProps(open),
  composer: sessionComposerProps(open),
  subagents: sessionAgents(open),
  shells: open.shells,
  inspectorPanels: open.inspectorPanels,
  onDropFiles: (dropped) => void open.commands.attachDroppedFiles(dropped),
  archived: open.snapshot.archivedAt !== null,
});

// What the Session view draws for the Feed's progress: failed, still opening, or open.
export function toSessionViewProps(
  sources: SessionDetailViewSources,
): SessionDetailViewProps {
  const opened = openFeed(sources.feed);

  return (
    failedSession(sources, opened) ??
    (opened
      ? { state: 'open', ...openSessionProps({ ...sources, ...opened }) }
      : { state: 'opening' })
  );
}

function sessionAgents(
  open: OpenSessionSources,
): NonNullable<OpenSessionViewProps['subagents']> {
  return { subagents: open.snapshot.subagents };
}
