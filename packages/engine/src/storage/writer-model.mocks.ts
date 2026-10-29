import {
  type GraphEventFromLogic,
  getShortestPaths,
  getSimplePaths,
} from '@repo/vitest/model-graph';
import { terminalPaths } from '@repo/vitest/model-paths';
import {
  drainWriterEvent,
  input,
  isRefusable,
  job,
  machine,
  mockDatabase,
  refusableJob,
  writeError,
  writeFeedEvent,
  type WriterSnapshot,
} from './writer-fixture.mocks';

// Done and error events of invoked actors are not in the machine's event type, but the model drives them.
const events = [
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
  { type: 'xstate.after.writeRetryDelay.databaseWriter.waitingToRetry' },
] satisfies GraphEventFromLogic<typeof machine>[];

export type WriterEvent = (typeof events)[number];

export type WriterStateName =
  | 'idle'
  | 'writing'
  | 'waitingToRetry'
  | 'draining'
  | 'drained';

const canGraphEvent = (
  snapshot: WriterSnapshot,
  event: WriterEvent,
): boolean => {
  if (
    event.type === 'xstate.after.writeRetryDelay.databaseWriter.waitingToRetry'
  )
    return snapshot.matches('waitingToRetry');

  if (isBatchEvent(event)) return batchIsActive(snapshot);

  return snapshot.can(event);
};

type BatchEvent = Extract<
  WriterEvent,
  { type: 'xstate.done.actor.writeBatch' | 'xstate.error.actor.writeBatch' }
>;

const batchEvents = new Set([
  'xstate.done.actor.writeBatch',
  'xstate.error.actor.writeBatch',
]);

const isBatchEvent = (event: WriterEvent): event is BatchEvent =>
  batchEvents.has(event.type);

const batchIsActive = (snapshot: WriterSnapshot): boolean =>
  snapshot.matches('writing') || snapshot.matches('draining');

const options = {
  input,
  events,
  limit: 1000,
  // A done actor ignores events, so the model must not send any.
  filterEvents: (snapshot: WriterSnapshot, event: WriterEvent): boolean =>
    snapshot.status === 'active' && canGraphEvent(snapshot, event),
  // Never the jobs themselves, only whether a batch runs and jobs wait behind it; `via` gives each self-transition its own vertex.
  serializeState: (
    snapshot: WriterSnapshot,
    event: WriterEvent | undefined,
    previous?: WriterSnapshot,
  ): string =>
    JSON.stringify({
      value: snapshot.value,
      batch: snapshot.context.batchSize > 0,
      waiting: snapshot.context.queue.length > snapshot.context.batchSize,
      via: event && `${JSON.stringify(previous?.value)} ${event.type}`,
    }),
};

// Refusable writes and the budget they spend, walked by shortest paths only so simple paths stay few.
export const budgetOptions = {
  ...options,
  events: [
    ...events,
    { type: writeFeedEvent, job: refusableJob(0) },
  ] satisfies WriterEvent[],
  serializeState: (
    snapshot: WriterSnapshot,
    event: WriterEvent | undefined,
    previous?: WriterSnapshot,
  ): string =>
    JSON.stringify({
      state: options.serializeState(snapshot, event, previous),
      refusableQueued: snapshot.context.queue.some(isRefusable),
      refusing: snapshot.context.refusing,
    }),
};

export const shortestPaths = terminalPaths(
  getShortestPaths(machine, budgetOptions),
);

export const simplePaths = terminalPaths(getSimplePaths(machine, options));

mockDatabase.$client.close();
