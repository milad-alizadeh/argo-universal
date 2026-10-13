import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  harness,
  loseOpenConnection,
  resetHarness,
  startConnection,
  stopConnections,
  waitForAllowedAttempt,
} from './connection-machine.mocks';

// Numbers written out so the model cannot grade itself.
const retryDelayMs = (attempts: number): number =>
  Math.min(500 * 2 ** attempts, 30_000);

beforeEach(() => {
  vi.useFakeTimers();
  resetHarness();
});

afterEach(() => {
  stopConnections();
  vi.useRealTimers();
});

// The real retry timer, exercised with the default actor clock.
describe('connection retry delay', () => {
  it('allows the first attempt at once', () => {
    const connection = startConnection();

    expect(waitForAllowedAttempt(connection)).toBe(0);
  });

  it('waits before a second attempt while still connecting', () => {
    const connection = startConnection();
    waitForAllowedAttempt(connection);

    expect(waitForAllowedAttempt(connection)).toBe(retryDelayMs(1));
  });

  it('doubles the retry delay from 0.5 seconds to a 30-second cap', () => {
    const connection = startConnection();
    loseOpenConnection();

    const waits = Array.from({ length: 9 }, () =>
      waitForAllowedAttempt(connection),
    );

    expect(waits).toEqual([
      500, 1000, 2000, 4000, 8000, 16_000, 30_000, 30_000, 30_000,
    ]);
    expect(waits).toEqual(waits.map((_, attempts) => retryDelayMs(attempts)));
  });

  it('starts the retry delay over after the Connection opens', () => {
    const connection = startConnection();
    loseOpenConnection();
    for (let attempt = 0; attempt < 4; attempt++)
      waitForAllowedAttempt(connection);

    loseOpenConnection();

    expect(waitForAllowedAttempt(connection)).toBe(500);
  });

  it('allows a waiting attempt at once when the app comes to the foreground', () => {
    const connection = startConnection();
    loseOpenConnection();
    connection.send({ type: 'connection.attemptRequested' });

    connection.send({ type: 'app.foreground' });

    expect(harness.allowedAttempts).toBe(1);
    vi.advanceTimersByTime(retryDelayMs(0));
    expect(harness.allowedAttempts).toBe(1);
  });
});
