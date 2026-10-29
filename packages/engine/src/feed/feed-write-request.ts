import type { SessionUpdate } from '@repo/contracts';
import { AtomicWriterJob, type WriterJob, type WriterEvent } from '../storage';
import type { FeedContext, FeedEvent, FeedInternalEvent } from './feed-machine';
import { outputBlobsOf, promptBlobIds } from './feed-row';
import { FeedRowsJob } from './feed-rows-job';

export type WriterJobParameters = Pick<
  Extract<WriterEvent, { type: 'writer.write' }>,
  'job' | 'committed' | 'refused'
>;

export const rejectUnavailableWriter = (params: WriterJobParameters): void => {
  params.committed?.reject(new Error('Database Writer is unavailable'));
};

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
    job: withCompanionJob(createRowsJob(context, rows), event),
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

const withCompanionJob = (
  job: FeedRowsJob,
  event: FeedEvent | FeedInternalEvent,
): WriterJob =>
  'commitWith' in event && event.commitWith
    ? new AtomicWriterJob([job, event.commitWith])
    : job;
