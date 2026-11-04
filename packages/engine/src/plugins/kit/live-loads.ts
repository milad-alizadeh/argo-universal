/*
 * A live page's Loader yields over time, as an async generator does (ADR-0050). These are the ways Argo
 * reads one: every exit calls the iterator's `return()`, so the Loader's own `finally` runs.
 */

// Whether a Loader answered values over time rather than one.
export const isYielding = <Data>(
  loaded: Data | AsyncIterable<Data>,
): loaded is AsyncIterable<Data> =>
  typeof loaded === 'object' && loaded !== null && Symbol.asyncIterator in loaded;

// The first value a live Loader yields, as a one-off draw or a background pass draws it; the Loader stops after.
export async function firstOf<Data>(loaded: AsyncIterable<Data>): Promise<Data> {
  const iterator = loaded[Symbol.asyncIterator]();

  try {
    const first = await iterator.next();

    if (first.done === true) throw new Error('The live page yielded nothing');

    return first.value;
  } finally {
    await iterator.return?.();
  }
}

/*
 * How a live draw is stopped: the realm has no AbortController, so a stop is a promise the reading races, set
 * once by the host's stop or by the draw's own end.
 */
export type Stop = { stopped: Promise<'stopped'>; stop: () => void };

export function stopper(): Stop {
  const { promise, resolve } = Promise.withResolvers<'stopped'>();

  return { stopped: promise, stop: () => resolve('stopped') };
}

type Next<Data> = IteratorResult<Data> | 'stopped';

/*
 * Each value the Loader yields, one at a time, until it ends or it is stopped. A Loader waiting inside an
 * await when it is stopped is left to settle; its `return()` is queued, and its `finally` runs once that
 * await does.
 */
export async function eachYielded<Data>(
  loaded: AsyncIterable<Data>,
  { stopped }: Stop,
  each: (data: Data) => Promise<void>,
): Promise<void> {
  const iterator = loaded[Symbol.asyncIterator]();

  try {
    for (;;) {
      const next: Next<Data> = await Promise.race([iterator.next(), stopped]);

      if (next === 'stopped' || next.done === true) return;

      await each(next.value);
    }
  } finally {
    void Promise.resolve(iterator.return?.()).catch(() => null);
  }
}
