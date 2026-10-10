import type { ActorRefFrom } from 'xstate';
import type { WriterJob } from './writer-job';
import type { writerMachine } from './writer-machine';

export type WriterActorRef = ActorRefFrom<typeof writerMachine>;

// Jobs the Writer holds but has not committed, oldest first; each module reads its own.
export const readQueuedJobs = (
  writer: WriterActorRef | undefined,
): readonly WriterJob[] => writer?.getSnapshot().context.queue ?? [];
