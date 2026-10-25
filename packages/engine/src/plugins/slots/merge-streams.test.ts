import { expect, it, vi } from 'vitest';
import { merged, type SourceFailed } from './merge-streams';

async function* items(...values: number[]): AsyncGenerator<number> {
  await Promise.resolve();
  yield* values;
}

const broken = (message: string): AsyncIterable<number> => ({
  [Symbol.asyncIterator]: () => ({
    next: () => Promise.reject(new Error(message)),
  }),
});

async function* yieldsThenThrows(): AsyncGenerator<number> {
  await Promise.resolve();
  yield 9;
  throw new Error('late');
}

async function collect(stream: AsyncIterable<number>): Promise<number[]> {
  const out: number[] = [];

  for await (const item of stream) out.push(item);

  return out.sort((a, b) => a - b);
}

it('ends a throwing source on its own and reports it once', async () => {
  const failed = vi.fn<SourceFailed>();

  const out = await collect(
    merged(
      [
        { id: 'a', source: items(1, 2) },
        { id: 'b', source: broken('boom') },
        { id: 'c', source: items(3) },
      ],
      failed,
    ),
  );

  expect(out).toEqual([1, 2, 3]);
  expect(failed).toHaveBeenCalledExactlyOnceWith('b', 'boom');
});

it('reports a source that throws after it has yielded and keeps the others', async () => {
  const failed = vi.fn<SourceFailed>();

  const out = await collect(
    merged(
      [
        { id: 'a', source: yieldsThenThrows() },
        { id: 'b', source: items(1, 2) },
      ],
      failed,
    ),
  );

  expect(out).toEqual([1, 2, 9]);
  expect(failed).toHaveBeenCalledExactlyOnceWith('a', 'late');
});

it('reports a non-Error throw as its string', async () => {
  const failed = vi.fn<SourceFailed>();

  const source: AsyncIterable<number> = {
    [Symbol.asyncIterator]: () => ({
      next: () => Promise.reject('plain'),
    }),
  };

  await collect(merged([{ id: 'a', source }], failed));

  expect(failed).toHaveBeenCalledExactlyOnceWith('a', 'plain');
});

it('does not let a throwing report break the merge', async () => {
  const failed = vi.fn<SourceFailed>(() => {
    throw new Error('report failed');
  });

  const out = await collect(
    merged(
      [
        { id: 'a', source: broken('one') },
        { id: 'b', source: broken('two') },
        { id: 'c', source: items(1) },
      ],
      failed,
    ),
  );

  expect(out).toEqual([1]);
  expect(failed).toHaveBeenCalledTimes(2);
});

it('does not report sources that finish cleanly', async () => {
  const failed = vi.fn<SourceFailed>();

  await collect(
    merged(
      [
        { id: 'a', source: items(1) },
        { id: 'b', source: items(2) },
      ],
      failed,
    ),
  );

  expect(failed).not.toHaveBeenCalled();
});
