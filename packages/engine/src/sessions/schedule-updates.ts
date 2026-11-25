import { EventEmitter, on } from 'node:events';
import type { Subscription } from 'xstate';
import type { Schedule } from './schedule-store';
import type { SessionHandlerSources } from './session-sources';
import { onWriterChange } from './writer-changes';

interface Watched {
  sessionId: string;
  read: () => Schedule[];
}

// Tells when a write to one of the Session's Schedules is announced.
function watchWrites(
  sources: Pick<SessionHandlerSources, 'findWriter'>,
  sessionId: string,
  changes: EventEmitter<{ change: [] }>,
): Subscription | undefined {
  const writer = sources.findWriter();

  return writer
    ? onWriterChange(writer, (change) => {
        if (change.sessionIds.includes(sessionId)) changes.emit('change');
      })
    : undefined;
}

async function* differing(
  changes: AsyncIterable<unknown>,
  { read }: Watched,
  first: Schedule[],
): AsyncGenerator<Schedule[], void> {
  let sent = JSON.stringify(first);

  for await (const _ of changes) {
    const next = read();
    const key = JSON.stringify(next);

    if (key === sent) continue;
    sent = key;
    yield next;
  }
}

// A Session's Schedules now, and again each time a write to one of them is announced and the list differs.
export async function* scheduleUpdates(
  sources: Pick<SessionHandlerSources, 'findWriter'>,
  watched: Watched,
  signal?: AbortSignal,
): AsyncGenerator<Schedule[], void> {
  const changes = new EventEmitter<{ change: [] }>();
  const watching = watchWrites(sources, watched.sessionId, changes);

  try {
    const events = on(changes, 'change', { signal });
    const first = watched.read();

    yield first;
    yield* differing(events, watched, first);
  } catch (error) {
    if (!signal?.aborted) throw error;
  } finally {
    watching?.unsubscribe();
  }
}
