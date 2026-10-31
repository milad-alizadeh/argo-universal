import type { SessionSnapshot } from '@repo/contracts';
import type { FeedProps, useSessionFeed } from '#features/feed';
import {
  openFailureText,
  sessionMissing,
  type SessionHeaderProps,
  type SessionHeaderStatus,
  type ShellPanelProps,
  type SessionPanels,
} from '#features/sessions';
import type { SessionCallouts } from '#features/sessions';
import {
  leaveForSessions,
  sessionHref,
} from '#lib/product/navigation/navigation';
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
  shells: ShellPanelProps;
  inspectorPanels: SessionPanels;
  // The Connection dropped the Feed's open: the page keeps opening, and a toast says why.
  feedDropped: boolean;
};

type OpenSessionSources = OpenSession &
  Pick<SessionDetailViewSources, 'callouts' | 'shells' | 'inspectorPanels'>;

type FeedFailure = Pick<SessionDetailViewSources, 'feed' | 'feedDropped'>;

const headerStatus = {
  running: 'running',
  requires_action: 'needs_input',
  idle: 'idle',
} satisfies Record<SessionSnapshot['state'], SessionHeaderStatus>;

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

// The menu's Rename and Archive come from the page, which also draws the dialogs they open.
const sessionHeaderProps = ({ snapshot }: OpenSession): SessionHeaderProps => ({
  title: snapshot.title,
  status: headerStatus[snapshot.state],
  startedAt: snapshot.liveHeader?.startedAt ?? null,
  menu: {
    archived: snapshot.archivedAt !== null,
    status: headerStatus[snapshot.state],
  },
});

const sessionFeedProps = (open: OpenSession): FeedProps => ({
  items: open.view.items,
  liveHeader: open.snapshot.liveHeader,
  liveToolCall: open.feed.liveToolCall,
  loadingOlder: open.feed.loadingOlder,
  onStartReached: () => void open.feed.loadOlder(),
  imageUrl: open.imageUrl,
  checkoutBranch: open.snapshot.checkout.branch ?? undefined,
  onAtEndChange: open.onAtEndChange,
});

const openSessionProps = (open: OpenSessionSources): OpenSessionViewProps => ({
  ...open.callouts,
  elicitation: open.elicitation,
  header: sessionHeaderProps(open),
  feed: sessionFeedProps(open),
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
  return {
    subagents: open.snapshot.subagents,
    onSelect: (one) => {
      if (!one.readOnly) open.navigate(sessionHref(one.sessionId));
    },
  };
}
