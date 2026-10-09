import { EventEmitter, on } from 'node:events';
import type { CatalogSyncSupervisor } from './catalog';

export async function* watchCommittedCatalogChanges(
  actor: CatalogSyncSupervisor,
  signal: AbortSignal,
): AsyncGenerator<string[]> {
  const events = new EventEmitter<{ change: [string[]] }>();
  const subscription = actor.on('catalog.committed', ({ changedIds }) =>
    events.emit('change', changedIds),
  );
  try {
    yield* readCatalogChangeStream(events, signal);
  } finally {
    subscription.unsubscribe();
  }
}

async function* readCatalogChangeStream(
  events: EventEmitter<{ change: [string[]] }>,
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
