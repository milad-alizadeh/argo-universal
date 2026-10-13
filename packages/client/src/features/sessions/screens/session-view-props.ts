import type { SessionSnapshot } from '@repo/contracts';
import type { FeedProps, useSessionFeed } from '#features/feed';
import type {
  SessionHeaderProps,
  SessionHeaderStatus,
} from '../components/session-header';
import type {
  OpenSessionViewProps,
  SessionViewProps,
} from '../components/session-view/session-view';
import {
  type OpenSession,
  sessionComposerProps,
} from './session-composer-props';

type SessionFeed = ReturnType<typeof useSessionFeed>;
type OpenFeed = Pick<OpenSession, 'snapshot' | 'view'>;
export type SessionViewSources = Omit<OpenSession, 'snapshot' | 'view'>;

const headerStatus = {
  running: 'running',
  requires_action: 'needs_input',
  idle: 'idle',
} satisfies Record<SessionSnapshot['state'], SessionHeaderStatus>;

// A failed first page refetches by itself when the Connection reopens or the window regains focus.
function failedSession(feed: SessionFeed): SessionViewProps | undefined {
  if (feed.error) return { state: 'failed' };
  if (feed.openError)
    return { state: 'failed', reason: feed.openError.message };
  return undefined;
}

const loadedFeed = ({ snapshot, view }: SessionFeed): OpenFeed | undefined =>
  snapshot && view ? { snapshot, view } : undefined;

const openFeed = (feed: SessionFeed): OpenFeed | undefined =>
  feed.ready ? loadedFeed(feed) : undefined;

const sessionHeaderProps = (snapshot: SessionSnapshot): SessionHeaderProps => ({
  title: snapshot.title,
  status: headerStatus[snapshot.state],
  startedAt: snapshot.liveHeader?.startedAt ?? null,
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

const openSessionProps = (open: OpenSession): OpenSessionViewProps => ({
  header: sessionHeaderProps(open.snapshot),
  feed: sessionFeedProps(open),
  composer: sessionComposerProps(open),
});

// What the Session view draws for the Feed's progress: failed, still opening, or open.
export function toSessionViewProps(
  sources: SessionViewSources,
): SessionViewProps {
  const opened = openFeed(sources.feed);
  return (
    failedSession(sources.feed) ??
    (opened
      ? { state: 'open', ...openSessionProps({ ...sources, ...opened }) }
      : { state: 'opening' })
  );
}
