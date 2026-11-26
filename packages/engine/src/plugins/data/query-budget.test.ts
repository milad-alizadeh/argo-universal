import { expect, it } from 'vitest';
import {
  harness,
  overview,
  pluginId,
  valueOf,
  type Harness,
} from '#mocks/plugin-data-harness';

// A Query a page read once, and that a write has since made due.
async function answeredThenDue(budgetLeft: number): Promise<Harness> {
  const github = harness();
  const first = github.read();

  await github.answer({ count: 1 });
  await first;
  github.data.written(pluginId);
  github.faults.budgetLeft = budgetLeft;

  return github;
}

// A background pass or a Watch: a draw no page holds, which reads fresh.
const backgroundRead = (github: Harness): ReturnType<Harness['read']> =>
  github.read({ holder: undefined }, true);

const readFor = (
  github: Harness,
  origin: { forRun?: true; slot?: true },
): ReturnType<Harness['read']> =>
  github.data.handle(
    { pluginId, generation: 1 },
    { api: 'data', action: 'read', query: overview, fresh: false },
    origin,
  );

it('serves a background pass the kept answer without asking the worker while less than a quarter of a rate limit is left', async () => {
  const github = await answeredThenDue(0.2);

  expect(valueOf(await backgroundRead(github))).toEqual({ count: 1 });
  expect(github.reads()).toHaveLength(1);
});

it('reads a background pass fresh while a quarter or more is left', async () => {
  const github = await answeredThenDue(0.25);
  const pass = backgroundRead(github);

  await expect.poll(() => github.reads()).toHaveLength(2);
  await github.answer({ count: 2 });

  expect(valueOf(await pass)).toEqual({ count: 2 });
});

it('still reads what an Operation run asks for, and what a page on screen draws, while less than a tenth is left', async () => {
  const github = await answeredThenDue(0.05);
  const asked = readFor(github, { forRun: true });

  await expect.poll(() => github.reads()).toHaveLength(2);
  await github.answer({ count: 2 });
  expect(valueOf(await asked)).toEqual({ count: 2 });

  // The page is served what it drew, and its due Query is read behind it.
  github.data.written(pluginId);
  await github.read();

  await expect.poll(() => github.reads()).toHaveLength(3);
});

it('serves code outside a draw that nobody asked for the kept answer while less than a tenth is left, and reads it above that', async () => {
  const low = await answeredThenDue(0.05);

  expect(valueOf(await readFor(low, {}))).toEqual({ count: 1 });
  expect(low.reads()).toHaveLength(1);

  const enough = await answeredThenDue(0.2);
  const outside = readFor(enough, {});

  await expect.poll(() => enough.reads()).toHaveLength(2);
  await enough.answer({ count: 2 });
  expect(valueOf(await outside)).toEqual({ count: 2 });
});

it('reads a background pass that has nothing kept, whatever is left', async () => {
  const github = harness();

  github.faults.budgetLeft = 0.01;
  const pass = backgroundRead(github);

  await expect.poll(() => github.reads()).toHaveLength(1);
  await github.answer({ count: 1 });

  expect(valueOf(await pass)).toEqual({ count: 1 });
});
