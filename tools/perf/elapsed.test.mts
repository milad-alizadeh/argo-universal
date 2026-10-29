import { afterEach, describe, expect, it, vi } from 'vitest';
import { measureElapsed, summarizeElapsed } from './elapsed.mts';

afterEach(() => vi.useRealTimers());

describe('elapsed action measurements', () => {
  it('starts after preparation and finishes only when the result is ready', async () => {
    vi.useFakeTimers();

    const result = await measureElapsed({
      prepare: async () => {
        await vi.advanceTimersByTimeAsync(1000);
      },
      action: async () => {
        await vi.advanceTimersByTimeAsync(30);
      },
      ready: async () => {
        await vi.advanceTimersByTimeAsync(20);
      },
    });

    expect(result).toEqual({ status: 'completed', elapsedMs: 50 });
  });

  it('retains failed readiness time without recording a successful latency', async () => {
    vi.useFakeTimers();

    const result = await measureElapsed({
      action: async () => {
        await vi.advanceTimersByTimeAsync(10);
      },
      ready: async () => {
        await vi.advanceTimersByTimeAsync(80);
        throw new Error('Expected Feed content never appeared');
      },
    });

    expect(result).toEqual({
      status: 'failed',
      phase: 'ready',
      elapsedMs: 90,
      error: 'Expected Feed content never appeared',
    });
    expect(summarizeElapsed([result])).toEqual({
      attempted: 1,
      completed: 0,
      failed: 1,
      timedOut: 0,
      p50Ms: null,
      maxMs: null,
    });
  });

  it('distinguishes preparation failures and timeouts from action failures', async () => {
    const timeout = new Error('No older page');
    timeout.name = 'TimeoutError';

    const result = await measureElapsed({
      prepare: async () => {
        throw timeout;
      },
      action: async () => {
        throw new Error('Must not dispatch');
      },
      ready: async () => {},
    });

    expect(result).toEqual({
      status: 'timed-out',
      phase: 'prepare',
      elapsedMs: null,
      error: 'No older page',
    });
  });

  it('keeps failed samples visible and only reports p95 with enough successes', () => {
    const completed = Array.from({ length: 20 }, (_, index) => ({
      status: 'completed' as const,
      elapsedMs: (index + 1) * 10,
    }));

    const failed = {
      status: 'timed-out' as const,
      phase: 'ready' as const,
      elapsedMs: 1000,
      error: 'not ready',
    };

    expect(summarizeElapsed([...completed, failed])).toEqual({
      attempted: 21,
      completed: 20,
      failed: 0,
      timedOut: 1,
      p50Ms: 100,
      p95Ms: 190,
      maxMs: 200,
    });
    expect(summarizeElapsed(completed.slice(0, 3))).toEqual({
      attempted: 3,
      completed: 3,
      failed: 0,
      timedOut: 0,
      p50Ms: 20,
      maxMs: 30,
    });
  });
});
