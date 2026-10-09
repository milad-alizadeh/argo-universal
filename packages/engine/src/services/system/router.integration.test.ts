import type { ClockTick } from '@repo/contracts';
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from 'vitest';
import { createRouterHost } from '#mocks/router';
import { appRouter } from '../../engine/router';

beforeEach((): void => {
  vi.useFakeTimers({ now: new Date('2026-10-03T12:00:00.000Z') });
});
afterEach((): void => {
  vi.useRealTimers();
});

it('reports configured System metadata with the current process and computer name', async (): Promise<void> => {
  const { caller } = createRouterHost({
    version: '9.8.7',
    startedAt: '2026-10-09T00:00:00.000Z',
  });
  expect(await caller.system.info()).toEqual({
    version: '9.8.7',
    startedAt: '2026-10-09T00:00:00.000Z',
    pid: process.pid,
    name: expect.stringMatching(/\S/),
  });
});

it('keeps the computer name stable across Engine contexts', async (): Promise<void> => {
  const first = await createRouterHost().caller.system.info();
  const { caller } = createRouterHost({ version: '9.8.7' });
  expect((await caller.system.info()).name).toBe(first.name);
});

async function subscribeToClock(
  controller = new AbortController(),
): Promise<AsyncIterator<ClockTick>> {
  const { context } = createRouterHost();
  onTestFinished((): void => controller.abort());
  const caller = appRouter.createCaller(context, { signal: controller.signal });
  return (await caller.system.clock())[Symbol.asyncIterator]();
}

it('emits the first clock tick without waiting', async (): Promise<void> => {
  const ticks = await subscribeToClock();
  expect(await ticks.next()).toEqual({
    done: false,
    value: { now: '2026-10-03T12:00:00.000Z' },
  });
});

it('emits subsequent clock ticks at one-second intervals', async (): Promise<void> => {
  const ticks = await subscribeToClock();
  await ticks.next();
  const second = ticks.next();
  await vi.advanceTimersByTimeAsync(1000);
  expect((await second).value).toEqual({ now: '2026-10-03T12:00:01.000Z' });
});

it('finishes a pending clock tick when its subscription aborts', async (): Promise<void> => {
  const controller = new AbortController();
  const ticks = await subscribeToClock(controller);
  await ticks.next();
  const next = ticks.next();
  controller.abort();
  expect(await next).toEqual({ done: true, value: undefined });
});

it('emits no clock ticks for an already aborted subscription', async (): Promise<void> => {
  const controller = new AbortController();
  controller.abort();
  const ticks = await subscribeToClock(controller);
  expect(await ticks.next()).toEqual({ done: true, value: undefined });
});
