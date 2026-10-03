import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSystemService } from '.';

const deps = { version: '1.2.3', startedAt: '2026-10-03T00:00:00.000Z' };

describe('system service', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-10-03T12:00:00.000Z') });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reports the version, start time, and process id', () => {
    expect(createSystemService(deps).info()).toEqual({
      version: '1.2.3',
      startedAt: '2026-10-03T00:00:00.000Z',
      pid: process.pid,
    });
  });

  it('ticks the clock at once and then every second', async () => {
    const ticks = createSystemService(deps)
      .clock(new AbortController().signal)
      [Symbol.asyncIterator]();

    expect((await ticks.next()).value).toEqual({
      now: '2026-10-03T12:00:00.000Z',
    });
    const second = ticks.next();
    await vi.advanceTimersByTimeAsync(1000);
    expect((await second).value).toEqual({ now: '2026-10-03T12:00:01.000Z' });
  });

  it('stops the clock when the signal aborts', async () => {
    const controller = new AbortController();
    const ticks = createSystemService(deps)
      .clock(controller.signal)
      [Symbol.asyncIterator]();
    await ticks.next();

    const next = ticks.next();
    controller.abort();

    expect(await next).toEqual({ done: true, value: undefined });
  });
});
