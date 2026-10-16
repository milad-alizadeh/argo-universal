import type { SessionSnapshot } from '@repo/contracts';
import type { FeedProps, useSessionFeed } from '#features/feed';
import {
  type SessionHeaderProps,
  sessionOpenErrorMessage,
  type SessionHeaderStatus,
} from '#features/sessions';
import type { SessionCallouts } from '#features/sessions';
import {
  type OpenSession,
  sessionComposerProps,
} from './session-composer-props';
import type {
  OpenSessionViewProps,
  SessionDetailViewProps,
} from './session-detail-view';

type SessionFeed = ReturnType<typeof useSessionFeed>;

type OpenFeed = Pick<OpenSession, 'snapshot' | 'view'>;

export type SessionDetailViewSources = Omit<
  OpenSession,
  'snapshot' | 'view'
> & {
  callouts: SessionCallouts;
};

type OpenSessionSources = OpenSession &
  Pick<SessionDetailViewSources, 'callouts'>;

const headerStatus = {
  running: 'running',
  requires_action: 'needs_input',
  idle: 'idle',
} satisfies Record<SessionSnapshot['state'], SessionHeaderStatus>;

// A failed first page refetches by itself when the Connection reopens or the window regains focus. An open Session keeps its Feed and Composer when its Agent fails: the callout says why.
function failedSession(
  feed: SessionFeed,
  opened: OpenFeed | undefined,
): SessionDetailViewProps | undefined {
  if (feed.error) return { state: 'failed' };

  return opened ? undefined : unopened(feed);
}

const unopened = ({
  openError,
}: SessionFeed): SessionDetailViewProps | undefined =>
  openError
    ? { state: 'failed', reason: sessionOpenErrorMessage(openError) }
    : undefined;

const loadedFeed = ({ snapshot, view }: SessionFeed): OpenFeed | undefined =>
  snapshot && view ? { snapshot, view } : undefined;

const openFeed = (feed: SessionFeed): OpenFeed | undefined =>
  feed.ready ? loadedFeed(feed) : undefined;

const sessionHeaderProps = ({
  snapshot,
  mergeMethod,
}: OpenSession): SessionHeaderProps => ({
  title: snapshot.title,
  status: headerStatus[snapshot.state],
  startedAt: snapshot.liveHeader?.startedAt ?? null,
  ...mergeMethod,
});

const sessionFeedProps = (open: OpenSession): FeedProps => ({
  items: open.view.items,
  liveHeader: open.snapshot.liveHeader,
  liveToolCall: open.feed.liveToolCall,
  loadingOlder: open.feed.loadingOlder,
  onStartReached: () => void open.feed.loadOlder(),
  imageUrl: open.imageUrl,
  checkoutBranch: open.snapshot.checkout.branch ?? undefined,
});

const openSessionProps = (open: OpenSessionSources): OpenSessionViewProps => ({
  ...open.callouts,
  elicitation: open.elicitation,
  header: sessionHeaderProps(open),
  feed: sessionFeedProps(open),
  composer: sessionComposerProps(open),
});

// What the Session view draws for the Feed's progress: failed, still opening, or open.
export function toSessionViewProps(
  sources: SessionDetailViewSources,
): SessionDetailViewProps {
  const opened = openFeed(sources.feed);

  return (
    failedSession(sources.feed, opened) ??
    (opened
      ? { state: 'open', ...openSessionProps({ ...sources, ...opened }) }
      : { state: 'opening' })
  );
}
