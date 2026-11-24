import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { throttle } from './throttle';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('runs at most a few times a second while events keep coming every frame', () => {
  const save = vi.fn<() => void>();
  const throttled = throttle(save, 250);

  for (let frame = 0; frame < 120; frame++) {
    throttled.call();
    vi.advanceTimersByTime(16);
  }

  // Two seconds of scrolling.
  vi.advanceTimersByTime(250);

  expect(save.mock.calls.length).toBeGreaterThanOrEqual(7);
  expect(save.mock.calls.length).toBeLessThanOrEqual(10);
});

it('runs once more after the last event, so the position where scrolling stopped is kept', () => {
  const save = vi.fn<() => void>();
  const throttled = throttle(save, 250);

  throttled.call();
  throttled.call();
  expect(save).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(250);

  expect(save).toHaveBeenCalledTimes(2);
});

it('drops a pending run when cancelled', () => {
  const save = vi.fn<() => void>();
  const throttled = throttle(save, 250);

  throttled.call();
  throttled.call();
  throttled.cancel();
  vi.advanceTimersByTime(1000);

  expect(save).toHaveBeenCalledTimes(1);
});
