import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import type { FeedSubscribeOutput } from '@repo/contracts';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

// Published budgets for 8 Sessions each streaming a 200 KB Agent message (measured alone: ~2.3 MiB, p95 ~10 ms, worst 30–80 ms; beside the whole test run: p95 ~31 ms, worst ~109 ms).
const retainedByteBudget = 8_388_608;
const eventLoopDelayP95BudgetMs = 50;
// One garbage collection may stall a single sample; a whole-message reparse would stall for seconds.
const eventLoopDelayWorstBudgetMs = 250;
const p95 = 0.95;
const sessionCount = 8;
const chunkCount = 2000;
const burstSize = 10;
const chunk = 'x'.repeat(99);

setFlagsFromString('--expose-gc');
const gc: unknown = runInNewContext('gc');
const readRetainedBytes = (): number => {
  if (typeof gc !== 'function') throw new Error('gc is unavailable');
  gc();
  gc();
  return process.memoryUsage().heapUsed;
};

// How late each 10 ms timer fires through the event loop's own work: lateness counts only up to the CPU time the main thread used meanwhile, so neither other test files sharing the machine nor V8's helper threads count.
const sampleEventLoopDelay = (): { stop: () => number[] } => {
  const delays: number[] = [];
  let timer: NodeJS.Timeout | undefined;
  const schedule = (): void => {
    const due = performance.now() + 10;
    const cpu = process.threadCpuUsage();
    timer = setTimeout((): void => {
      const used = process.threadCpuUsage(cpu);
      const cpuMs = (used.user + used.system) / 1000;
      delays.push(Math.min(performance.now() - due, cpuMs));
      schedule();
    }, 10);
  };
  schedule();
  return {
    stop: (): number[] => {
      clearTimeout(timer);
      return delays.toSorted((left, right) => left - right);
    },
  };
};

const readUntilIdle = async (
  events: AsyncIterable<FeedSubscribeOutput>,
): Promise<number> => {
  let appended = 0;
  let running = false;
  for await (const event of events) {
    if (event.type === 'row.append') appended += event.text.length;
    if (
      event.type === 'row.upsert' &&
      event.row.sessionUpdate === 'agent_message'
    )
      appended = event.row.content.reduce(
        (length, block) =>
          length + (block.type === 'text' ? block.text.length : 0),
        0,
      );
    if (event.type !== 'snapshot') continue;
    if (event.snapshot.state === 'running') running = true;
    if (running && event.snapshot.state === 'idle') return appended;
  }
  return appended;
};

it('long Agent messages in several Sessions stay within the retained-byte and event-loop-delay budgets', async () => {
  const host = await startAcpEngine({
    steps: Array.from({ length: chunkCount / burstSize }, () => [
      ...Array.from({ length: burstSize }, (): ScriptedStep => ({
        type: 'update',
        update: {
          sessionUpdate: 'agent_message_chunk',
          content: { type: 'text', text: `${chunk},` },
        },
      })),
      { type: 'yield' as const },
    ]).flat(),
  });
  const sessions = await Promise.all(
    Array.from({ length: sessionCount }, () =>
      host.caller.session.new(emptySessionInput),
    ),
  );
  const before = readRetainedBytes();
  const delay = sampleEventLoopDelay();
  const subscriptions = await Promise.all(
    sessions.map((created) =>
      host.caller.feed.subscribe({ ...created, after: null }),
    ),
  );
  const reading = Promise.all(subscriptions.map(readUntilIdle));
  await Promise.all(
    sessions.map((created) =>
      host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Write' }],
      }),
    ),
  );
  const appended = await reading;
  const delays = delay.stop();
  const retained = readRetainedBytes() - before;
  const delayP95 = delays[Math.floor(delays.length * p95)] ?? 0;
  const delayWorst = delays.at(-1) ?? 0;
  expect(
    {
      appended,
      withinRetainedBudget: retained <= retainedByteBudget,
      withinDelayBudget:
        delayP95 <= eventLoopDelayP95BudgetMs &&
        delayWorst <= eventLoopDelayWorstBudgetMs,
    },
    `retained ${retained} B, delay p95 ${delayP95} ms, worst ${delayWorst} ms`,
  ).toEqual({
    appended: sessions.map(() => chunkCount * (chunk.length + 1)),
    withinRetainedBudget: true,
    withinDelayBudget: true,
  });
}, 60_000);
