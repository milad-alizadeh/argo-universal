import type { Subscription } from 'xstate';
import type { WriterActorRef, WriterJob } from '../storage';

export type WriterChange = { sessionIds: string[]; turnIds: string[] };

const unique = (ids: string[]): string[] => [...new Set(ids)];

// Each job names the rows it changes; a job that names none changes no Session or Turn reads.
const describeWriterChanges = (jobs: readonly WriterJob[]): WriterChange => ({
  sessionIds: unique(jobs.flatMap((job) => job.changedSessionIds?.() ?? [])),
  turnIds: unique(jobs.flatMap((job) => job.changedTurnIds?.() ?? [])),
});

// Calls `listener` when the Writer queues jobs and again when they commit.
export const onWriterChange = (
  writer: WriterActorRef,
  listener: (change: WriterChange) => void,
): Subscription => {
  const subscriptions = writerSubscriptions(writer, listener);

  return {
    unsubscribe: (): void => {
      unsubscribeAll(subscriptions);
    },
  };
};

function unsubscribeAll(subscriptions: Subscription[]): void {
  for (const subscription of subscriptions) subscription.unsubscribe();
}

function writerSubscriptions(
  writer: WriterActorRef,
  listener: (change: WriterChange) => void,
): Subscription[] {
  return (['writer.queued', 'writer.committed'] as const).map((type) =>
    writer.on(type, ({ jobs }): void => listener(describeWriterChanges(jobs))),
  );
}
