import { EventEmitter, on } from 'node:events';

type Merge<T> = EventEmitter<{ item: [T]; done: [] }>;

async function drain<T>(
  source: AsyncIterator<T>,
  events: Merge<T>,
): Promise<void> {
  for (let next = await source.next(); !next.done; next = await source.next())
    events.emit('item', next.value);
}

const ignore = (): void => {};

// Emits `done` once every source has ended, whether it finished or threw.
function pumpAll<T>(sources: AsyncIterator<T>[], events: Merge<T>): void {
  let open = sources.length;

  const ended = (): void => {
    open -= 1;

    if (open === 0) events.emit('done');
  };

  if (open === 0) events.emit('done');

  for (const source of sources)
    void drain(source, events).catch(ignore).finally(ended);
}

const stop = (source: AsyncIterator<unknown>): void => void source.return?.();

async function stopAll<T>(
  sources: AsyncIterator<T>[],
  stream: AsyncIterator<unknown>,
): Promise<void> {
  for (const source of sources) stop(source);
  await stream.return?.();
}

/*
 * Yields each source's items as they arrive and ends once every source has ended. A source that
 * throws ends on its own, so one Plugin's broken contribution never ends another's.
 */
export async function* merged<T>(
  sources: AsyncIterable<T>[],
): AsyncGenerator<T> {
  const events: Merge<T> = new EventEmitter();
  const stream = on(events, 'item', { close: ['done'] });
  const iterators = sources.map((source) => source[Symbol.asyncIterator]());

  pumpAll(iterators, events);

  try {
    for await (const [item] of stream) yield item;
  } finally {
    await stopAll(iterators, stream);
  }
}
