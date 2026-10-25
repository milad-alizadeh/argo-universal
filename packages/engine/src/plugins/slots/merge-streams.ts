import { EventEmitter, on } from 'node:events';

type Merge<T> = EventEmitter<{ item: [T]; done: [] }>;

export type Source<T> = { id: string; source: AsyncIterable<T> };

export type SourceFailed = (id: string, reason: string) => void;

type Running<T> = { id: string; iterator: AsyncIterator<T> };

type Pump<T> = { events: Merge<T>; failed: SourceFailed; ended: () => void };

async function drain<T>(
  iterator: AsyncIterator<T>,
  events: Merge<T>,
): Promise<void> {
  for (
    let next = await iterator.next();
    !next.done;
    next = await iterator.next()
  )
    events.emit('item', next.value);
}

// `failed` only reports, so a throwing report never stops the merge.
const report = (failed: SourceFailed, id: string, reason: string): void => {
  try {
    failed(id, reason);
  } catch {
    // ignored
  }
};

const pump = async <T>(
  { id, iterator }: Running<T>,
  { events, failed, ended }: Pump<T>,
): Promise<void> => {
  try {
    await drain(iterator, events);
  } catch (error) {
    report(failed, id, error instanceof Error ? error.message : String(error));
  } finally {
    ended();
  }
};

// Emits `done` once every source has ended, whether it finished or threw.
function pumpAll<T>(
  sources: Running<T>[],
  events: Merge<T>,
  failed: SourceFailed,
): void {
  let open = sources.length;

  const ended = (): void => {
    open -= 1;

    if (open === 0) events.emit('done');
  };

  if (open === 0) events.emit('done');

  for (const source of sources) void pump(source, { events, failed, ended });
}

const stop = (source: AsyncIterator<unknown>): void => void source.return?.();

async function stopAll<T>(
  sources: Running<T>[],
  stream: AsyncIterator<unknown>,
): Promise<void> {
  for (const { iterator } of sources) stop(iterator);
  await stream.return?.();
}

const iteratorOf = <T>({ id, source }: Source<T>): Running<T> => ({
  id,
  iterator: source[Symbol.asyncIterator](),
});

/*
 * Yields each source's items as they arrive and ends once every source has ended. A source that
 * throws ends on its own and is reported to `failed` by its id, so one Plugin's broken contribution
 * never ends another's.
 */
export async function* merged<T>(
  sources: Source<T>[],
  failed: SourceFailed,
): AsyncGenerator<T> {
  const events: Merge<T> = new EventEmitter();
  const stream = on(events, 'item', { close: ['done'] });
  const running = sources.map(iteratorOf);

  pumpAll(running, events, failed);

  try {
    for await (const [item] of stream) yield item;
  } finally {
    await stopAll(running, stream);
  }
}
