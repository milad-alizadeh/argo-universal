import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { RuntimeDeadline } from './runtime-deadline.mts';

let deadline: RuntimeDeadline;

beforeEach(() => {
  vi.useFakeTimers();
  deadline = new RuntimeDeadline(10_000);
});

afterEach(() => {
  deadline.stop();
  vi.useRealTimers();
});

it('does not spend the next phase while the first phase runs', () => {
  vi.advanceTimersByTime(5_000);

  expect(deadline.signal.aborted).toBe(false);
});

it('times the next phase from the moment it restarts', () => {
  vi.advanceTimersByTime(5_000);
  deadline.restart(500);
  vi.advanceTimersByTime(500);

  expect(deadline.signal.aborted).toBe(true);
});

it('does not abort just before the restarted phase elapses', () => {
  deadline.restart(500);
  vi.advanceTimersByTime(499);

  expect(deadline.signal.aborted).toBe(false);
});

it('bounds a first phase that never finishes', () => {
  vi.advanceTimersByTime(10_000);

  expect(deadline.signal.aborted).toBe(true);
});
