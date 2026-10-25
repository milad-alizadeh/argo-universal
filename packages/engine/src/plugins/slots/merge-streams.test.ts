import { expect, it, vi } from 'vitest';
import { merged } from './merge-streams';

async function* items(...values: number[]): AsyncGenerator<number> {
  await Promise.resolve();
  yield* values;
}

const broken = (message: string): AsyncIterable<number> => ({
  [Symbol.asyncIterator]: () => ({
    next: () => Promise.reject(new Error(message)),
  }),
});

async function collect(stream: AsyncIterable<number>): Promise<number[]> {
  const out: number[] = [];

  for await (const item of stream) out.push(item);

  return out.sort();
}

it('ends a throwing source on its own and reports it once', async () => {
  const failed = vi.fn<(index: number, reason: string) => void>();

  const out = await collect(
    merged([items(1, 2), broken('boom'), items(3)], failed),
  );

  expect(out).toEqual([1, 2, 3]);
  expect(failed).toHaveBeenCalledOnce();
  expect(failed).toHaveBeenCalledWith(1, 'boom');
});

it('does not report sources that finish cleanly', async () => {
  const failed = vi.fn<(index: number, reason: string) => void>();

  await collect(merged([items(1), items(2)], failed));

  expect(failed).not.toHaveBeenCalled();
});
