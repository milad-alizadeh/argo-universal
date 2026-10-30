import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { runtimeContext } from './runtime-context.mts';

vi.mock('./runtime-client.mts', () => ({
  runtimeClient: () => ({ client: {}, close: vi.fn() }),
}));

const target = { httpUrl: 'http://127.0.0.1:1', token: 'x', sessionId: 's' };

const workload = { id: 'w', prompt: 'p', timeoutMs: 500 };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('does not spend the workload timeout while the Session is being prepared', () => {
  const context = runtimeContext(target, workload);
  vi.advanceTimersByTime(5_000);
  expect(context.signal.aborted).toBe(false);

  context.startDeadline();
  vi.advanceTimersByTime(499);
  expect(context.signal.aborted).toBe(false);
  vi.advanceTimersByTime(1);
  expect(context.signal.aborted).toBe(true);
  context.close();
});

it('still bounds a Session that never finishes preparing', () => {
  const context = runtimeContext(target, workload);
  vi.advanceTimersByTime(10_000);
  expect(context.signal.aborted).toBe(true);
  context.close();
});
