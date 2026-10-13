import type { SessionSnapshot, ToolCallUpdate } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import type { FeedGroup } from '../view/feed-view';
import {
  type Exploration,
  firstGroup,
  inCatalog,
  isCommand,
  missingRecordedState,
  type RecordedFeedMock,
  recordingRows,
  required,
  runningRow,
  startedAt,
  streamedRows,
  toolCallRows,
} from './recorded-tool-calls.mocks';

interface ParallelCalls {
  parallel: FeedGroup;
  earlier: ToolCallUpdate;
  later: ToolCallUpdate;
}

interface ToolCallGroupMock extends ParallelCalls {
  agent: RecordedFeedMock['agent'];
  group: FeedGroup;
  running: FeedGroup;
  exploration: Exploration;
  now: number;
}

const editAndCommand = recordedFeedMocks.filter(
  (mock) => mock.recording === 'edit-and-command',
);

export const commandMocks = editAndCommand.map((mock) => ({
  agent: mock.agent,
  row: required(toolCallRows(mock.rows).find(isCommand), 'a command'),
}));

export const completedCommand =
  commandMocks[0]?.row ?? missingRecordedState('a command');

const commandOutcomes = recordingRows('command-outcomes');

export const longOutputCommand =
  commandOutcomes.find((row) => row.status === 'completed') ??
  missingRecordedState('long output');

export const failedCommand =
  commandOutcomes.find((row) => row.status === 'failed') ??
  missingRecordedState('a failed command');

export const stoppedCommand =
  recordingRows('interrupt').find((row) => row.status === 'cancelled') ??
  missingRecordedState('a stopped command');

export const runningCommand =
  runningRow(streamedRows(recordedFeedMocks), completedCommand.toolCallId) ??
  missingRecordedState('a running command');

export const commandNow = startedAt(runningCommand) + 23000;

const firstCompletedRead = (exploration: Exploration): ToolCallUpdate => {
  const read = exploration.toolCalls[0];
  return inCatalog(
    read?.status === 'completed' ? read : undefined,
    'a completed read for parallel calls',
  );
};

function parallelCalls(
  active: ToolCallUpdate,
  exploration: Exploration,
  snapshot: SessionSnapshot,
): ParallelCalls {
  const read = firstCompletedRead(exploration);
  const earlier = { ...active, position: 0 };
  const later = { ...read, position: 1, turnId: earlier.turnId };
  const parallel = inCatalog(
    firstGroup([earlier, later], snapshot),
    'a parallel Tool call group',
  );
  return { parallel, earlier, later };
}

function runningGroup(
  rows: ToolCallUpdate[],
  mock: RecordedFeedMock,
): { active: ToolCallUpdate; running: FeedGroup } {
  const command = required(rows.find(isCommand), 'a command');
  const active = required(
    runningRow(streamedRows([mock]), command.toolCallId),
    'a running command',
  );
  const live = rows.map((row) => (row.id === active.id ? active : row));
  const running = required(firstGroup(live, mock.snapshot), 'a running group');
  return { active, running };
}

function groupMock(mock: RecordedFeedMock): ToolCallGroupMock {
  const rows = toolCallRows(mock.rows).filter((row) =>
    ['read', 'search', 'execute'].includes(row.kind),
  );
  const group = required(firstGroup(rows, mock.snapshot), 'a Tool call group');
  const { active, running } = runningGroup(rows, mock);
  const exploration = required(
    group.items.find((item) => item.type === 'exploration'),
    'exploration',
  );
  const parallel = parallelCalls(active, exploration, mock.snapshot);
  const now = startedAt(active) + 23000;
  return { agent: mock.agent, group, running, exploration, ...parallel, now };
}

export const toolCallGroupMocks = editAndCommand.map(groupMock);

export const toolCallGroupMock =
  toolCallGroupMocks[0] ?? missingRecordedState('a group');

export const readMocks = toolCallGroupMocks.map(({ agent, exploration }) => ({
  agent,
  row: exploration.toolCalls[0] ?? missingRecordedState('a file read'),
}));
export const completedRead =
  readMocks[0]?.row ?? missingRecordedState('a file read');
export const runningRead =
  runningRow(streamedRows(recordedFeedMocks), completedRead.toolCallId) ??
  missingRecordedState('a running file read');
