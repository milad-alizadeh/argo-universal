import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReloadPacer } from './reload-pacer';

const quietMs = 1000;

interface Reloads {
  reload: () => Promise<void>;
  started: () => number;
  end: () => Promise<void>;
}

// A reload the test ends by hand, and how many have started.
function reloads(): Reloads {
  const ends: (() => void)[] = [];

  return {
    reload: (): Promise<void> =>
      new Promise<void>((resolve) => void ends.push(resolve)),
    started: (): number => ends.length,
    end: async (): Promise<void> => {
      ends.at(-1)?.();
      await vi.advanceTimersByTimeAsync(0);
    },
  };
}

describe('ReloadPacer', () => {
  beforeEach(() => void vi.useFakeTimers());
  afterEach(() => void vi.useRealTimers());

  it('reloads at once when asked while idle', () => {
    const { reload, started } = reloads();

    new ReloadPacer(reload, quietMs).request();

    expect(started()).toBe(1);
  });

  it('never starts a second reload while one runs', () => {
    const { reload, started } = reloads();
    const pacer = new ReloadPacer(reload, quietMs);

    pacer.request();
    pacer.request();
    pacer.request();

    expect(started()).toBe(1);
  });

  it('reloads once more, after the quiet time, for everything asked meanwhile', async () => {
    const { reload, started, end } = reloads();
    const pacer = new ReloadPacer(reload, quietMs);

    pacer.request();
    pacer.request();
    await end();
    pacer.request();
    await vi.advanceTimersByTimeAsync(quietMs - 1);

    expect(started()).toBe(1);

    await vi.advanceTimersByTimeAsync(1);

    expect(started()).toBe(2);
  });

  it('stays idle after the quiet time when nothing was asked meanwhile', async () => {
    const { reload, started, end } = reloads();
    const pacer = new ReloadPacer(reload, quietMs);

    pacer.request();
    await end();
    await vi.advanceTimersByTimeAsync(quietMs);

    expect(started()).toBe(1);

    pacer.request();

    expect(started()).toBe(2);
  });

  it('reloads again after one that failed', async () => {
    let calls = 0;

    const pacer = new ReloadPacer(() => {
      calls += 1;

      return Promise.reject(new Error('offline'));
    }, quietMs);

    pacer.request();
    pacer.request();
    await vi.advanceTimersByTimeAsync(quietMs);

    expect(calls).toBe(2);
  });

  it('drops what waits once stopped, and reloads at once when asked again', async () => {
    const { reload, started, end } = reloads();
    const pacer = new ReloadPacer(reload, quietMs);

    pacer.request();
    pacer.request();
    pacer.stop();
    await end();
    await vi.advanceTimersByTimeAsync(quietMs);

    expect(started()).toBe(1);

    pacer.request();

    expect(started()).toBe(2);
  });
});
