import { EventEmitter, on } from 'node:events';
import type { Database } from '@repo/db';
import { agents } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import type { ActorRefFrom } from 'xstate';
import type { writerMachine } from '../../feed';

export async function* watchCommittedCatalogChanges(
  input: { database: Database; writer: ActorRefFrom<typeof writerMachine> },
  signal: AbortSignal,
): AsyncGenerator<string[]> {
  const events = new EventEmitter<{ change: [string[]] }>();
  const subscription = input.writer.on('catalog.sqlCommitted', ({ commits }) => {
    if (!commits.some(({ kind }) => kind === 'agentCatalogReplace' || kind === 'catalogSyncFailure')) return;
    const changedIds = input.database.select({ id: agents.id }).from(agents)
      .where(eq(agents.catalogPresent, true)).all().map(({ id }) => id);
    events.emit('change', changedIds);
  });
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
