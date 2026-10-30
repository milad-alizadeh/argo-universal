import type {
  LiveHeader,
  SessionMessage,
  SessionUpdate,
  Subagent,
  ToolCallUpdate,
} from '@repo/contracts';
import { type FeedProps, toSubagentFeedView } from '#features/feed';
import {
  recordedFeedMock,
  recordedImageUrl,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';

const recording = recordedFeedMock('agent-2', 'edit-and-command');

const parentSessionId = 'parent-session';

const subagentSessionId = 'subagent-readers';

const prompt = recordedUserMessage('agent-2', 'edit-and-command');

// The child transcript's own view of the message that started it, as the Agent reported it (#937).
const incoming: SessionMessage = {
  ...prompt,
  sessionId: subagentSessionId,
  sessionUpdate: 'session_message',
  messageId: `${prompt.messageId}-incoming`,
  _meta: {
    argo: {
      senderSessionId: parentSessionId,
      recipientSessionId: subagentSessionId,
    },
  },
};

// The child's own updates: everything the recording holds after the prompt it answered.
const childRows: readonly SessionUpdate[] = recording.rows.slice(1);

const liveToolCallHeader = recording.liveHeaders.findLast(
  (header) => header.source.type === 'tool_call',
);

const liveSource = liveToolCallHeader?.source;

const liveToolCallId =
  liveSource?.type === 'tool_call' ? liveSource.toolCallId : undefined;

const liveToolCall = recording.rows.findLast(
  (row): row is ToolCallUpdate =>
    row.sessionUpdate === 'tool_call_update' &&
    row.toolCallId === liveToolCallId,
);

if (!liveToolCallHeader?.startedAt || !liveToolCall)
  throw new Error('Recorded catalog needs a started tool call');

const turnStartedAt = liveToolCallHeader.startedAt;

// 34s into the Subagent's Turn, as the Paper design draws it.
export const subagentFeedNow = turnStartedAt + 34_000;

const elapsedLabel = '34s';

// The live row the recording ends on, named as the Feed reads it out.
export const liveRowName = `${liveToolCallHeader.text} ${elapsedLabel}`;

const feedOf = (
  rows: readonly SessionUpdate[],
  liveHeader: LiveHeader | null,
): FeedProps => ({
  items: toSubagentFeedView(rows, recording.snapshot).items,
  liveHeader,
  liveToolCall:
    liveHeader?.source.type === 'tool_call' ? liveToolCall : undefined,
  loadingOlder: false,
  onStartReached: (): void => {},
  imageUrl: recordedImageUrl,
  now: subagentFeedNow,
});

export const runningFeed = feedOf([incoming, ...childRows], liveToolCallHeader);

export const finishedFeed = feedOf([incoming, ...childRows], null);

// Nothing reported yet: only the live row, which the Server names.
const startingLiveHeader: LiveHeader = {
  text: 'Starting',
  source: { type: 'working' },
  startedAt: subagentFeedNow - 2_000,
};

export const emptyFeed = feedOf([], startingLiveHeader);

// The Agent reported no incoming view, so the Feed starts with the child's own output.
export const noIncomingFeed = feedOf(childRows, liveToolCallHeader);

const subagent: Subagent = {
  sessionId: subagentSessionId,
  parentSessionId,
  readOnly: true,
  toolCallId: 'tool-readers',
  title: 'Find every Feed reader',
  role: 'Explore',
  model: 'Sonnet 4.5',
  state: 'running',
  stopReason: null,
  startedAt: turnStartedAt,
  endedAt: null,
  durationMs: null,
  tokens: 8_200,
};

export const runningSubagent = subagent;

export const startingSubagent: Subagent = {
  ...subagent,
  startedAt: subagentFeedNow - 2_000,
  tokens: null,
};

export const cancelledSubagent: Subagent = {
  ...subagent,
  state: 'idle',
  stopReason: 'cancelled',
  endedAt: turnStartedAt + 34_000,
  durationMs: 34_000,
};

export const finishedSubagent: Subagent = {
  ...subagent,
  state: 'idle',
  stopReason: 'end_turn',
  endedAt: turnStartedAt + 101_000,
  durationMs: 101_000,
  tokens: 12_900,
};
