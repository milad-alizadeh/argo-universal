import type { SessionSnapshot, ToolCallUpdate } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import { toolCallFacts } from '../view/feed-row-facts';
import type { FeedActivity, FeedGroup } from '../view/feed-view';
import { toFeedView } from '../view/to-feed-view';

export type RecordedFeedMock = (typeof recordedFeedMocks)[number];

type RecordedRow = RecordedFeedMock['rows'][number];

export type Exploration = Extract<FeedActivity, { type: 'exploration' }>;

export function missingRecordedState(state: string): never {
  throw new Error(`Recording needs ${state}`);
}

export const required = <T>(value: T | undefined, state: string): T =>
  value ?? missingRecordedState(state);

export function inCatalog<T>(value: T | undefined, need: string): T {
  if (value === undefined) throw new Error(`Recorded catalog needs ${need}`);

  return value;
}

const isToolCallUpdate = (row: RecordedRow): row is ToolCallUpdate =>
  row.sessionUpdate === 'tool_call_update';

export const toolCallRows = (rows: readonly RecordedRow[]): ToolCallUpdate[] =>
  rows.filter(isToolCallUpdate);

const readsFiles = (row: ToolCallUpdate): boolean =>
  toolCallFacts(row).actions.some((action) => action.type === 'read');

export const isCommand = (row: ToolCallUpdate): boolean =>
  row.kind === 'execute' && !readsFiles(row);

export const startedAt = (row: ToolCallUpdate): number =>
  toolCallFacts(row).startedAt ?? 0;

export const recordingRows = (recording: string): ToolCallUpdate[] =>
  toolCallRows(
    recordedFeedMocks
      .filter((mock) => mock.recording === recording)
      .flatMap((mock) => mock.rows),
  );

export const streamedRows = (
  mocks: readonly RecordedFeedMock[],
): ToolCallUpdate[] =>
  toolCallRows(
    mocks
      .flatMap((mock) => mock.stream)
      .flatMap((event) => ('row' in event ? [event.row] : [])),
  );

export const runningRow = (
  rows: readonly ToolCallUpdate[],
  toolCallId: string,
): ToolCallUpdate | undefined =>
  rows.find(
    (row) => row.toolCallId === toolCallId && row.status === 'in_progress',
  );

export const firstGroup = (
  rows: readonly ToolCallUpdate[],
  snapshot: SessionSnapshot,
): FeedGroup | undefined =>
  toFeedView(rows, snapshot).items.find(
    (item): item is FeedGroup => item.type === 'group',
  );
