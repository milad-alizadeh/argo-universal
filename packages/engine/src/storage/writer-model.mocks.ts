import type { GraphEventFromLogic } from '@repo/vitest/model-graph';
import type { DelayEvent, Vertex } from '@repo/vitest/model-test';
import {
  drainWriterEvent,
  isRefusable,
  job,
  machine,
  refusableJob,
  writeError,
  writeFeedEvent,
  type WriterSnapshot,
} from './writer-fixture.mocks';
import type { WriterJob } from './writer-job';

// Done and error events of invoked actors are not in the machine's event type, but the model drives them. Its retry delay needs no fixture.
export const fixtures = [
  { type: writeFeedEvent, job: job(0) },
  { type: drainWriterEvent },
  {
    type: 'xstate.done.actor.writeBatch',
    actorId: 'writeBatch',
    output: [],
  },
  {
    type: 'xstate.error.actor.writeBatch',
    error: writeError,
    actorId: 'writeBatch',
  },
] satisfies GraphEventFromLogic<typeof machine>[];

export type WriterEvent = (typeof fixtures)[number];

export type WriterStateName =
  | 'idle'
  | 'writing'
  | 'waitingToRetry'
  | 'draining'
  | 'drained';

// Never the jobs themselves, only whether a batch runs and jobs wait behind it.
export const vertex = (snapshot: WriterSnapshot): Vertex => ({
  value: snapshot.value,
  batch: snapshot.context.batchSize > 0,
  waiting: snapshot.context.queue.length > snapshot.context.batchSize,
});

// Refusable writes and the budget they spend, walked by shortest paths only so simple paths stay few.
export const budgetFixtures = [
  { type: writeFeedEvent, job: refusableJob(0) },
] satisfies WriterEvent[];

export const budgetVertex = (snapshot: WriterSnapshot): Vertex => ({
  state: vertex(snapshot),
  refusableQueued: snapshot.context.queue.some(isRefusable),
  refusing: snapshot.context.refusing,
});

const sentJob = (event: WriterEvent | DelayEvent): WriterJob | undefined =>
  'job' in event ? event.job : undefined;

export const label = (event: WriterEvent | DelayEvent): string | undefined => {
  const sent = sentJob(event);

  return sent && isRefusable(sent) ? 'refusable' : undefined;
};
