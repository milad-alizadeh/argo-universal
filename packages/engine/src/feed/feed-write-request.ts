import type { SessionUpdate } from '@repo/contracts';
import type { WriterEvent } from '../storage';
import type { FeedContext, FeedEvent, FeedInternalEvent } from './feed-machine';
import { outputBlobsOf, promptBlobIds } from './feed-row';
import { FeedRowsJob } from './feed-storage';

export type WriterJobParameters = Pick<
  Extract<WriterEvent, { type: 'writer.write' }>,
  'job' | 'committed' | 'refused'
>;

const changedRows = (context: FeedContext): SessionUpdate[] =>
  context.changedRowIds.flatMap((id) => {
    const row = context.rows[id];

    return row ? [row] : [];
  });

// Every changed row with the newest revision, as one job for the database writer.
export const createRowsWriteRequest = ({
  context,
  event,
}: {
  context: FeedContext;
  event: FeedEvent | FeedInternalEvent;
}): WriterJobParameters => {
  const rows = changedRows(context);

  return {
    committed: 'committed' in event ? event.committed : undefined,
    refused: context.storageFailing,
    job: createRowsJob(context, rows),
  };
};

const createRowsJob = (
  context: FeedContext,
  rows: SessionUpdate[],
): FeedRowsJob =>
  new FeedRowsJob({
    sessionId: context.sessionId,
    rows,
    maxRevision: context.maxRevision,
    activityAt: context.activityAt,
    blobIds: promptBlobIds(rows),
    blobs: outputBlobsOf(rows, context.outputBlobs),
  });
