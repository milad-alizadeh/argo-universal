import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { runtimeContext } from './runtime-context.mts';

vi.mock('./runtime-client.mts', () => ({
  runtimeClient: () => ({ client: {}, close: vi.fn() }),
}));

const target = { httpUrl: 'http://127.0.0.1:1', token: 'x', sessionId: 's' };

const workload = { id: 'w', prompt: 'p', timeoutMs: 500 };

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

let context: ReturnType<typeof runtimeContext>;

beforeEach(() => {
  context = runtimeContext(target, workload);
});

afterEach(() => context.close());

it('does not spend the workload timeout while the Session is being prepared', () => {
  vi.advanceTimersByTime(5_000);

  expect(context.signal.aborted).toBe(false);
});

it('times the workload from the moment its deadline starts', () => {
  vi.advanceTimersByTime(5_000);
  context.startDeadline();
  vi.advanceTimersByTime(500);

  expect(context.signal.aborted).toBe(true);
});

it('does not abort just before the workload timeout elapses', () => {
  context.startDeadline();
  vi.advanceTimersByTime(499);

  expect(context.signal.aborted).toBe(false);
});

it('still bounds a Session that never finishes preparing', () => {
  vi.advanceTimersByTime(10_000);

  expect(context.signal.aborted).toBe(true);
});
