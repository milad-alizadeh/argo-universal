import type {
  AgentInfo,
  SessionSnapshot,
  SessionUpdate,
} from '@repo/contracts';
import {
  type FeedMock,
  newSessionCatalogs,
  recordedFeedMocks,
  recordedSessionOptions,
} from '@repo/mocks/app';
import { fn } from 'storybook/test';
import { findLiveToolCall, toFeedView } from '#features/feed';
import {
  recordedFeedMock,
  recordedImageUrl,
} from '../../../lib/product/feed-message.mocks';
import type { OpenSessionViewProps } from './session-detail-view';

// Each recording's Agent in the catalog: agent-1 is the first entry, agent-2 the second.
function catalogAgentOf(mock: FeedMock): AgentInfo {
  const agent = newSessionCatalogs.bothAvailable.at(
    mock.agent === 'agent-1' ? 0 : 1,
  );

  if (!agent) throw new Error(`No catalog Agent for ${mock.agent}`);

  return agent;
}

const editAndCommand = recordedFeedMock('agent-1', 'edit-and-command');

const recordedHeader = editAndCommand.liveHeaders.findLast(
  (header) => header.startedAt !== null && header.source.type === 'tool_call',
);

if (!recordedHeader) throw new Error('No running live header recorded');

export const runningHeader = recordedHeader;

// A clock four minutes and twelve seconds into the running Turn.
const runningTurnNow = (runningHeader.startedAt ?? 0) + 252_000;

function liveStartedAt({ liveHeader }: SessionSnapshot): number | null {
  return liveHeader?.startedAt ?? null;
}

function recordedHeaderProps(
  snapshot: SessionSnapshot,
): OpenSessionViewProps['header'] {
  return {
    title: snapshot.title,
    status: snapshot.state === 'idle' ? 'idle' : 'running',
    startedAt: liveStartedAt(snapshot),
    now: runningTurnNow,
  };
}

function recordedFeedProps(
  mock: FeedMock,
  snapshot: SessionSnapshot,
): OpenSessionViewProps['feed'] {
  return {
    items: toFeedView(mock.rows, snapshot).items,
    liveHeader: snapshot.liveHeader,
    liveToolCall: findLiveToolCall(mock.rows, snapshot),
    loadingOlder: false,
    onStartReached: fn(),
    imageUrl: recordedImageUrl,
    checkoutBranch: snapshot.checkout.branch ?? undefined,
    now: runningTurnNow,
  };
}

function recordedCheckout({
  checkout,
}: SessionSnapshot): RecordedConfiguration['checkout'] {
  return {
    branch: checkout.branch ?? '',
    newWorktree: checkout.type === 'worktree',
    path: checkout.path,
  };
}

type RecordedConfiguration = NonNullable<
  OpenSessionViewProps['composer']['configuration']
>;

function recordedConfiguration(
  mock: FeedMock,
  snapshot: SessionSnapshot,
): RecordedConfiguration {
  const catalogAgent = catalogAgentOf(mock);

  return {
    agents: newSessionCatalogs.bothAvailable,
    agent: catalogAgent.agent,
    configOptions: recordedSessionOptions(catalogAgent.agent),
    onConfigChange: fn(),
    turnRunning: snapshot.state !== 'idle',
    checkout: recordedCheckout(snapshot),
  };
}

function recordedComposerProps(
  mock: FeedMock,
  snapshot: SessionSnapshot,
): OpenSessionViewProps['composer'] {
  return {
    draft: { text: '', attachments: [] },
    onDraftChange: fn(),
    onAttachImages: fn(),
    onAttachFiles: fn(),
    onDropFiles: fn(),
    onSend: fn(),
    onStop: fn(),
    configuration: recordedConfiguration(mock, snapshot),
  };
}

// An open Session's props from a recording, through the real Feed converter.
function openSessionProps(
  mock: FeedMock,
  snapshotChanges: Partial<SessionSnapshot> = {},
): OpenSessionViewProps {
  const snapshot = { ...mock.snapshot, ...snapshotChanges };

  return {
    header: recordedHeaderProps(snapshot),
    feed: recordedFeedProps(mock, snapshot),
    composer: recordedComposerProps(mock, snapshot),
  };
}

export const runningSession = openSessionProps(editAndCommand, {
  state: 'running',
  liveHeader: runningHeader,
  activeTurnId: 'turn-running',
});

export const idleSession = openSessionProps(
  recordedFeedMock('agent-2', 'markdown-answer'),
);

export const emptySession = openSessionProps(
  { ...editAndCommand, rows: [] },
  { title: 'New Session' },
);

// Every recording in turn, so the Feed scrolls.
export const longSession = openSessionProps({
  ...editAndCommand,
  rows: recordedFeedMocks.flatMap((mock, copy) =>
    mock.rows.map((row) => copiedRow(row, copy)),
  ),
});

// One recording's row as its `copy`th copy, with ids and positions after the copies before it.
function copiedRow(row: SessionUpdate, copy: number): SessionUpdate {
  const copied = {
    ...row,
    id: `${copy}-${row.id}`,
    position: copy * 1000 + row.position,
  };

  if ('toolCallId' in copied)
    copied.toolCallId = `${copy}-${copied.toolCallId}`;

  return copied;
}
