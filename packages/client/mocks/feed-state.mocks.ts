import type { FeedPageOutput, FeedSubscribeOutput } from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';
import { expect } from 'vitest';
import {
  applySubscriptionEvent,
  emptyFeed,
  type FeedState,
  mergeNewestPage,
} from '../src/features/feed/view/feed-state';
type RowEvent = Exclude<FeedSubscribeOutput, { type: 'snapshot' | 'closed' }>;

// What `feed.page` answers for a recorded Feed, as the Server pages it.
export function page(
  rows: FeedState['rows'],
  maxRevision: number,
  { before, limit = 40 }: { before?: number; limit?: number } = {},
): FeedPageOutput {
  const window = beforeRows(rows, before);
  const slice = window.slice(-limit);
  return pageWindow(window, slice, maxRevision);
}
function pageWindow(
  window: FeedState['rows'],
  slice: FeedPageOutput['rows'],
  maxRevision: number,
): FeedPageOutput {
  return {
    epoch: 0,
    maxRevision,
    rows: slice,
    hasOlder: slice.length < window.length,
    startCursor: sliceCursor(slice),
    staleCursor: false,
  };
}
function sliceCursor(rows: FeedState['rows']): number | null {
  return rows[0]?.position ?? null;
}

export const upsert = 'row.upsert' as const;
export const rowEvents = (stream: readonly FeedSubscribeOutput[]): RowEvent[] =>
  stream.filter(
    (event): event is RowEvent =>
      event.type !== 'snapshot' && event.type !== 'closed',
  );

export function replay(
  state: FeedState,
  events: readonly RowEvent[],
): FeedState {
  return events.reduce((current, event) => {
    const result = applySubscriptionEvent(current, event);
    expect(result.missingRowId).toBeUndefined();
    return result.feed;
  }, state);
}

function beforeRows(
  rows: FeedState['rows'],
  before: number | undefined,
): FeedState['rows'] {
  return rows.filter((row) => before === undefined || row.position < before);
}

const streamedRecording = recordedFeedMocks.find(
  (mock) => mock.agent === 'agent-2' && mock.recording === 'markdown-answer',
);
if (!streamedRecording) throw new Error('No streamed recording');
export const streamed = streamedRecording;
const firstAppend = streamed.stream.findIndex(
  (event) => event.type === 'row.append',
);
export const beforeAppend = replay(
  mergeNewestPage(emptyFeed, page([], 0)),
  rowEvents(streamed.stream.slice(0, firstAppend)),
);
const appendedEvent = streamed.stream[firstAppend];
if (appendedEvent?.type !== 'row.append')
  throw new Error('No append in streamed recording');

export const append = appendedEvent;
