import type { Subscription } from 'xstate';
import type { WriterActorRef, WriterJob } from '../storage';

export type WriterChange = { sessionIds: string[]; turnIds: string[] };

// The role of a job that changes what Session or Turn reads show; a job of any module takes it by having the member.
export interface AnnouncedJob {
  announcedChange: () => WriterChange;
}

const announces = (job: WriterJob): job is WriterJob & AnnouncedJob =>
  'announcedChange' in job;

const unique = (ids: string[]): string[] => [...new Set(ids)];

// The Sessions and Turns these jobs change, as the Writer announces them when they queue and commit.
export const writerChangeOf = (jobs: readonly WriterJob[]): WriterChange => {
  const changes = jobs.flatMap((job) =>
    announces(job) ? [job.announcedChange()] : [],
  );

  return {
    sessionIds: unique(changes.flatMap((change) => change.sessionIds)),
    turnIds: unique(changes.flatMap((change) => change.turnIds)),
  };
};

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
    writer.on(type, ({ jobs }): void => listener(writerChangeOf(jobs))),
  );
}
