import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { offlineDelayMs, retryDelayMs } from './connection';
import { type FakeLink, fakeLink } from './connection.mocks.ts';

let link: FakeLink;

beforeEach(() => {
  vi.useFakeTimers();
  link = fakeLink();
});

afterEach(() => {
  link.connection.stop();
  vi.useRealTimers();
});

interface Attempt {
  allowed: () => boolean;
}

// Asks the gate for an attempt; one still waiting is refused when the test stops the Connection.
function attempt(): Attempt {
  let allowed = false;

  link.connection.nextAttempt().then(
    () => {
      allowed = true;
    },
    () => {},
  );

  return { allowed: () => allowed };
}

async function allowedAfter(waitMs: number): Promise<void> {
  const next = attempt();
  await vi.advanceTimersByTimeAsync(waitMs);
  expect(next.allowed()).toBe(true);
}

describe('A waiting Connection attempt', () => {
  it('waits before a second attempt while still connecting', async () => {
    await allowedAfter(0);
    const second = attempt();

    await vi.advanceTimersByTimeAsync(retryDelayMs(1) - 1);
    expect(second.allowed()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(second.allowed()).toBe(true);
  });

  it('keeps waiting when the Connection goes offline', async () => {
    link.open();
    link.lose();

    let elapsed = 0;
    let index = 0;

    while (elapsed + retryDelayMs(index) < offlineDelayMs) {
      await allowedAfter(retryDelayMs(index));
      elapsed += retryDelayMs(index);
      index += 1;
    }

    const waiting = attempt();
    await vi.advanceTimersByTimeAsync(offlineDelayMs - elapsed);

    expect(link.connection.state()).toBe('offline');
    expect(waiting.allowed()).toBe(false);
    await vi.advanceTimersByTimeAsync(
      retryDelayMs(index) - (offlineDelayMs - elapsed),
    );
    expect(waiting.allowed()).toBe(true);
  });

  it('goes at once when another attempt is asked for', async () => {
    link.open();
    link.lose();
    const first = attempt();

    attempt();
    await vi.advanceTimersByTimeAsync(0);

    expect(first.allowed()).toBe(true);
  });
});
