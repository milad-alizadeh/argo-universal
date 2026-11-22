import { afterEach, expect, it, vi } from 'vitest';
import { ScheduleTimers } from './schedule-machine';

type Delivery = (id: string, signal: AbortSignal) => Promise<void>;

afterEach(() => {
  vi.useRealTimers();
});

it('replaces a deadline and drops the timer after delivery becomes inactive', async () => {
  vi.useFakeTimers({ now: 0 });

  let deadline: number | undefined = 100;

  const deliver = vi.fn<Delivery>(async (): Promise<void> => {
    deadline = undefined;
  });

  const timers = new ScheduleTimers({
    nextAt: (): number | undefined => deadline,
    deliver,
  });

  timers.refresh('run');
  deadline = 200;
  timers.refresh('run');

  await vi.advanceTimersByTimeAsync(100);
  expect(deliver).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(100);
  expect(deliver).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it('retries an active deadline and stops in-flight delivery when the Server stops', async () => {
  vi.useFakeTimers({ now: 0 });

  const deadline = 100;
  const stop = new AbortController();
  const held = Promise.withResolvers<void>();

  const deliver = vi
    .fn<Delivery>(() => held.promise)
    .mockRejectedValueOnce(new Error('Temporarily busy'));

  const timers = new ScheduleTimers(
    { nextAt: (): number | undefined => deadline, deliver },
    stop.signal,
  );

  timers.refresh('run');
  await vi.advanceTimersByTimeAsync(100);
  expect(deliver).toHaveBeenCalledOnce();
  await vi.advanceTimersToNextTimerAsync();
  await vi.advanceTimersToNextTimerAsync();
  expect(deliver).toHaveBeenCalledTimes(2);

  const signal = deliver.mock.calls.at(-1)?.[1];
  expect(signal?.aborted).toBe(false);
  stop.abort();
  expect(signal?.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  held.resolve();
});
