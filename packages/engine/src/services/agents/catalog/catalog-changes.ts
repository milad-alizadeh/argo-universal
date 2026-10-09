import { EventEmitter, on } from 'node:events';
import type { Database } from '@repo/db';
import type { ActorRefFrom } from 'xstate';
import type { writerMachine } from '../../feed';
import { readLatestCatalogChangeIds } from './catalog-sql';

type CatalogChangeEvents = EventEmitter<{
  change: [string[]];
  error: [unknown];
}>;
type CatalogWatchInput = {
  database: Database;
  writer: ActorRefFrom<typeof writerMachine>;
};

export async function* watchCommittedCatalogChanges(
  input: CatalogWatchInput,
  signal: AbortSignal,
): AsyncGenerator<string[]> {
  const events: CatalogChangeEvents = new EventEmitter();
  const subscription = subscribeCatalogCommitNotifications(input, events);
  try {
    yield* readCatalogChangeStream(events, signal);
  } finally {
    subscription.unsubscribe();
  }
}

function subscribeCatalogCommitNotifications(
  input: CatalogWatchInput,
  events: CatalogChangeEvents,
): { unsubscribe(): void } {
  return input.writer.on('catalog.sqlCommitted', ({ commits }) => {
    if (
      !commits.some(
        ({ kind }) =>
          kind === 'agentCatalogReplace' || kind === 'catalogSyncFailure',
      )
    )
      return;
    publishCommittedCatalogChanges(input.database, events);
  });
}

function publishCommittedCatalogChanges(
  database: Database,
  events: CatalogChangeEvents,
): void {
  try {
    events.emit('change', readLatestCatalogChangeIds(database));
  } catch (error) {
    events.emit('error', error);
  }
}

async function* readCatalogChangeStream(
  events: CatalogChangeEvents,
  signal: AbortSignal,
): AsyncGenerator<string[]> {
  const stream: AsyncIterable<string[][]> = on(events, 'change', { signal });
  try {
    for await (const changes of stream) yield* changes;
  } catch (error) {
    rethrowUncancelledCatalogStreamFailure(signal, error);
  }
}

function rethrowUncancelledCatalogStreamFailure(
  signal: AbortSignal,
  error: unknown,
): void {
  if (!signal.aborted) throw error;
}
