import type { WriterJob } from '../storage';
import { FeedRowsJob } from './feed-rows-job';
import type { CommittedTurnEnding } from './turn-end';

export type { CommittedTurnEnding };

// The live Turn endings in a Writer commit. Only the live Feed queues a `FeedRowsJob`; startup recovery and archive settlement write through `writeBorrowedFeedRows`, so their endings never appear here.
export const committedTurnEndings = (
  jobs: readonly WriterJob[],
): readonly CommittedTurnEnding[] =>
  jobs.flatMap((job) => (job instanceof FeedRowsJob ? job.turnEndings() : []));
