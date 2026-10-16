import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type FakeLink, fakeLink, offlineDelayMs } from './connection.mocks';

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

    await vi.advanceTimersByTimeAsync(999);
    expect(second.allowed()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(second.allowed()).toBe(true);
  });

  it('keeps waiting when the Connection goes offline', async () => {
    link.open();
    link.lose();

    for (const waitMs of [500, 1000, 2000, 4000]) await allowedAfter(waitMs);
    const fifth = attempt();
    await vi.advanceTimersByTimeAsync(offlineDelayMs - 7500);

    expect(link.connection.state()).toBe('offline');
    expect(fifth.allowed()).toBe(false);
    await vi.advanceTimersByTimeAsync(8000 - (offlineDelayMs - 7500));
    expect(fifth.allowed()).toBe(true);
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
