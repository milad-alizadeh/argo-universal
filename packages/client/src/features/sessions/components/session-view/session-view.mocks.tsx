import type { AgentInfo, SessionSnapshot } from '@repo/contracts';
import {
  type FeedMock,
  newSessionCatalogs,
  recordedFeedMocks,
} from '@repo/mocks/app';
import { fn } from 'storybook/test';
import { findLiveToolCall, toFeedView } from '#features/feed';
import {
  recordedFeedMock,
  recordedImageUrl,
} from '../../../../lib/product/feed-message.mocks';
import type { SessionPullRequest } from '../session-pull-request';
import type { OpenSessionViewProps } from './session-view';

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

// An open Session's props from a recording, through the real Feed converter.
function openSessionProps(
  mock: FeedMock,
  snapshotChanges: Partial<SessionSnapshot> = {},
): OpenSessionViewProps {
  const snapshot = { ...mock.snapshot, ...snapshotChanges };
  const view = toFeedView(mock.rows, snapshot);
  const { liveHeader } = snapshot;
  const catalogAgent = catalogAgentOf(mock);
  return {
    header: {
      title: snapshot.title,
      status: snapshot.state === 'idle' ? 'idle' : 'running',
      startedAt: liveHeader?.startedAt ?? null,
      now: runningTurnNow,
    },
    feed: {
      items: view.items,
      liveHeader,
      liveToolCall: findLiveToolCall(mock.rows, snapshot),
      loadingOlder: false,
      onStartReached: fn(),
      imageUrl: recordedImageUrl,
      checkoutBranch: snapshot.checkout.branch ?? undefined,
      now: runningTurnNow,
    },
    composer: {
      draft: { text: '', attachments: [] },
      onDraftChange: fn(),
      onAttachImages: fn(),
      onAttachFiles: fn(),
      onDropFiles: fn(),
      onSend: fn(),
      onStop: fn(),
      configuration: {
        agents: newSessionCatalogs.bothAvailable,
        agent: catalogAgent.agent,
        configOptions: catalogAgent.configOptions,
        onConfigChange: fn(),
        turnRunning: snapshot.state !== 'idle',
        checkout: {
          branch: snapshot.checkout.branch ?? '',
          newWorktree: snapshot.checkout.type === 'worktree',
          path: snapshot.checkout.path,
        },
      },
    },
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
    mock.rows.map((row) => ({
      ...row,
      id: `${copy}-${row.id}`,
      position: copy * 1000 + row.position,
      ...('toolCallId' in row
        ? { toolCallId: `${copy}-${row.toolCallId}` }
        : {}),
    })),
  ),
});

// A Session's PR with its checks running, failing or passed.
const sessionPullRequest = {
  number: 45,
  title: 'Build the Session layout from spec 0003',
  status: 'open',
  mergeable: false,
} satisfies SessionPullRequest;

export const pullRequestMocks = {
  checksRunning: {
    ...sessionPullRequest,
    checks: { passed: 3, failing: 0, running: 2, total: 5 },
  },
  checksFailing: {
    ...sessionPullRequest,
    checks: { passed: 4, failing: 1, running: 0, total: 5 },
  },
  checksPassed: {
    ...sessionPullRequest,
    checks: { passed: 5, failing: 0, running: 0, total: 5 },
    mergeable: true,
  },
  followUp: {
    number: 46,
    title: 'Wire the Inspector to the changed files',
    status: 'draft',
    mergeable: false,
  },
} satisfies Record<string, SessionPullRequest>;

// The running Session with its PRs on the header.
export function withPullRequests(
  session: OpenSessionViewProps,
  pullRequests: SessionPullRequest[],
): OpenSessionViewProps {
  return {
    ...session,
    header: { ...session.header, pullRequests, onMerge: fn() },
  };
}
