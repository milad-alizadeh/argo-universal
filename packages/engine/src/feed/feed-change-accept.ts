import { SessionUpdate } from '@repo/contracts';
import { z } from 'zod';
import type { Feed, FeedChangeResult } from './feed-change';
import type { FeedCandidate } from './feed-change-candidate';

type ToolCallRow = Extract<
  SessionUpdate,
  { sessionUpdate: 'tool_call_update' }
>;

const permissionMetadata = (
  row: ToolCallRow,
): NonNullable<ToolCallRow['_meta']>['argo'] => row._meta?.argo;

const permissionOutcome = (
  row: ToolCallRow,
): NonNullable<ReturnType<typeof permissionMetadata>>['permissionOutcome'] =>
  permissionMetadata(row)?.permissionOutcome;

const mergePermissionOutcome = (
  existing: ToolCallRow,
  row: ToolCallRow,
): ToolCallRow => ({
  ...row,
  _meta: {
    ...existing._meta,
    ...row._meta,
    argo: {
      ...permissionMetadata(existing),
      ...permissionMetadata(row),
      permissionOutcome: permissionOutcome(existing) ?? permissionOutcome(row),
    },
  },
});

const isToolCall = (row: SessionUpdate | undefined): row is ToolCallRow =>
  row?.sessionUpdate === 'tool_call_update';

const preservePermissionOutcome = (
  existing: SessionUpdate | undefined,
  row: SessionUpdate,
): SessionUpdate => {
  if (!isToolCall(existing)) return row;

  if (!isToolCall(row)) return row;

  return preserveToolPermissionOutcome(existing, row);
};

const preserveToolPermissionOutcome = (
  existing: ToolCallRow,
  row: ToolCallRow,
): ToolCallRow =>
  permissionOutcome(existing) || permissionOutcome(row)
    ? mergePermissionOutcome(existing, row)
    : row;

const updatedFeed = (
  feed: Feed,
  row: SessionUpdate,
  existing: SessionUpdate | undefined,
): Feed => ({
  ...feed,
  maxRevision: feed.maxRevision + 1,
  nextPosition: existing ? feed.nextPosition : feed.nextPosition + 1,
  rows: { ...feed.rows, [row.id]: row },
});

export const acceptFeedCandidate = (
  feed: Feed,
  id: string,
  candidate: FeedCandidate,
): FeedChangeResult => {
  const parsed = SessionUpdate.safeParse(candidate.row);

  if (!parsed.success)
    return { rejection: candidateRejection(id, candidate, parsed.error) };
  const row = preservePermissionOutcome(feed.rows[id], parsed.data);

  return {
    feed: updatedFeed(feed, row, feed.rows[id]),
    streamEvent: candidate.toStreamEvent(row),
  };
};

const candidateRejection = (
  id: string,
  candidate: FeedCandidate,
  error: z.ZodError,
): string =>
  `row ${id} does not match ${candidate.row.sessionUpdate}: ${z.prettifyError(error)}`;
