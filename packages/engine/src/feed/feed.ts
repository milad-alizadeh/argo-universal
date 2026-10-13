import type { SessionUpdate } from '@repo/contracts';
import type { FeedRowInput, FeedSubscribeOutput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { Observer, Subscription } from 'xstate';
import { type FeedRowSources } from './feed-catch-up';
import { readWrittenRow } from './feed-row';
import { readQueuedFeedRow } from './feed-storage';
export { streamFeed } from './feed-stream';

type SnapshotEvent = Extract<
  FeedSubscribeOutput,
  { type: 'snapshot' | 'closed' }
>;

// What Feed needs from Sessions; the Engine composition supplies it, so Feed imports no Sessions code.
interface SessionLookup {
  readSession: (sessionId: string) => { epoch: number; maxRevision: number };
  watchSessionSnapshot: (
    sessionId: string,
    listener: Observer<SnapshotEvent>,
  ) => Subscription;
}

export interface FeedDeps extends FeedRowSources, SessionLookup {}

type RowSources = Pick<
  FeedDeps,
  'database' | 'readSession' | 'findFeed' | 'findWriter'
>;

export function readFeedRow(
  feedResources: RowSources,
  { sessionId, id }: FeedRowInput,
): SessionUpdate {
  feedResources.readSession(sessionId);
  const newest = findNewestRow(feedResources, { sessionId, id });
  if (!newest)
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `No row ${id} in Session ${sessionId}`,
    });
  return newest;
}

function findNewestRow(
  resources: Pick<FeedDeps, 'database' | 'findFeed' | 'findWriter'>,
  { sessionId, id }: FeedRowInput,
): SessionUpdate | undefined {
  return (
    resources.findFeed(sessionId)?.getSnapshot().context.rows[id] ??
    readWrittenRow({
      database: resources.database,
      pending: readQueuedFeedRow(resources.findWriter(), { sessionId, id }),
      sessionId,
      id,
    })
  );
}

export { readFeedPage } from './feed-page';
