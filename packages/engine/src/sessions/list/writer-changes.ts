import type { WriterActorRef, WriterJob } from '../../storage';
import { changedSessionIds, changedTurnIds } from '../session-storage';

export type WriterChange = { sessionIds: string[]; turnIds: string[] };

const describeWriterChanges = (jobs: readonly WriterJob[]): WriterChange => ({
  sessionIds: [...new Set(jobs.flatMap(changedSessionIds))],
  turnIds: changedTurnIds(jobs),
});

// Calls `listener` when the Writer queues jobs and again when they commit.
export const onWriterChange = (
  writer: WriterActorRef,
  listener: (change: WriterChange) => void,
): { unsubscribe: () => void } => {
  const subscriptions = (['writer.queued', 'writer.committed'] as const).map(
    (type) =>
      writer.on(type, ({ jobs }): void =>
        listener(describeWriterChanges(jobs)),
      ),
  );
  return {
    unsubscribe: (): void => {
      for (const subscription of subscriptions) subscription.unsubscribe();
    },
  };
};
