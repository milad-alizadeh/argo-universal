import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import { type FeedMock, recordedFeedMocks } from '@repo/mocks/app';
import {
  recordedFeedMock,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';
import { completedCommand } from '../tool-call.mocks';

// The client's page size: the Feed opens on the newest page and asks for older ones a page at a time.
export const pageSize = 150;

// Only the oldest page holds this recording, and only the arriving row holds the other, so their text marks each one.
const oldestRecording = recordedFeedMock('agent-2', 'compaction');

const arrivingRecording = recordedFeedMock('agent-2', 'command-outcomes');

const snapshotRecording = recordedFeedMock('agent-1', 'edit-and-command');

interface RecordedBlock {
  type: string;
  text?: string;
}

const textOf = (block: RecordedBlock | undefined): string | undefined =>
  block?.type === 'text' ? block.text : undefined;

function firstTextOf(row: { content: readonly RecordedBlock[] }): string {
  const text = textOf(row.content[0]);

  if (text === undefined) throw new Error('Recorded message has no text');

  return text;
}

// The Long Feed's first message, which only the oldest page holds.
export const oldestMessage = firstTextOf(
  recordedUserMessage('agent-2', 'compaction'),
);

// Each recording's rows as one more copy, with ids and positions after the copies before it.
const rowsAsCopy = (mock: FeedMock, copy: number): FeedMock['rows'] =>
  mock.rows.map((row) => rowAsCopy(row, copy));

function rowAsCopy(row: SessionUpdate, copy: number): SessionUpdate {
  const copied = {
    ...row,
    id: `${copy}-${row.id}`,
    position: copy * 1000 + row.position,
  };

  if ('toolCallId' in copied)
    copied.toolCallId = `${copy}-${copied.toolCallId}`;

  return copied;
}

// The oldest recording, then every other recording seven times over, so the Feed spans several pages.
const repeatedRecordings = Array.from({ length: 7 }, () =>
  recordedFeedMocks.filter(
    (mock) => mock !== oldestRecording && mock !== arrivingRecording,
  ),
).flat();

export const longRows: readonly SessionUpdate[] = [
  oldestRecording,
  ...repeatedRecordings,
].flatMap(rowsAsCopy);

const newestRevision = Math.max(...longRows.map((row) => row.revision));

// The snapshot the Long Feed's rows are drawn against.
export const longSnapshot: SessionSnapshot = {
  ...snapshotRecording.snapshot,
  maxRevision: newestRevision,
};

// The newest page, which the Feed opens on.
export const longTail = longRows.slice(-pageSize);

const splitGroupSize = 20;

const splitGroupRowsInTail = splitGroupSize / 2;

// One Turn of numbered commands, which the Feed draws as one Tool call group.
const { commandActions: _, ...commandArgo } =
  completedCommand._meta?.argo ?? {};

const splitGroupSteps = Array.from(
  { length: splitGroupSize },
  (_unused, index): SessionUpdate => ({
    ...completedCommand,
    id: `split-step-${index + 1}`,
    toolCallId: `split-step-${index + 1}`,
    turnId: 'turn-split-group',
    title: `Step ${index + 1}`,
    _meta: { ...completedCommand._meta, argo: commandArgo },
  }),
);

// The newest page starts at Step 11, so the older page brings Steps 1 to 10 into the same group.
export const splitGroupRows: readonly SessionUpdate[] = [
  ...longRows.slice(0, splitGroupSize),
  ...splitGroupSteps,
  ...longRows.slice(-(pageSize - splitGroupRowsInTail)),
].map((row, index) => ({ ...row, position: index + 1 }));

export const splitGroupStepInTail = `Step ${splitGroupSize - 2}`;

export const splitGroupLastStep = `Step ${splitGroupSize}`;

// The split group as the newest page draws it, and its first command there.
export const splitGroupHeader = `Ran ${splitGroupRowsInTail} commands`;

export const splitGroupFirstStepInTail = `Step ${splitGroupRowsInTail + 1}`;

// The row the Agent sends while the reader is scrolled up: its first message, since plain text matches exactly where the last one ends in `done`, which other recordings send too.
const arrivingAgentMessage = arrivingRecording.rows.find(
  (row) => row.sessionUpdate === 'agent_message',
);

const lastLongRow = longRows.at(-1);

if (arrivingAgentMessage?.sessionUpdate !== 'agent_message' || !lastLongRow)
  throw new Error('No arriving message recorded');

export const arrivingMessage = firstTextOf(arrivingAgentMessage);

export const arrivingRow: SessionUpdate = {
  ...arrivingAgentMessage,
  id: 'arriving-row',
  position: lastLongRow.position + 1,
  revision: newestRevision + 1,
};
