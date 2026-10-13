import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  harness,
  linkState,
  loseOpenConnection,
  lostError,
  resetHarness,
  startConnection,
  stopConnections,
  waitForAllowedAttempt,
} from './connection-machine.mocks';

// Written out so the model cannot grade itself.
const offlineDelayMs = 10_000;

beforeEach(() => {
  vi.useFakeTimers();
  resetHarness();
});

afterEach(() => {
  stopConnections();
  vi.useRealTimers();
});

// The real offline timer, exercised with the default actor clock.
describe('connection offline delay', () => {
  it('a loss before the first open goes offline after offlineDelay', () => {
    const connection = startConnection();
    harness.watcher.send({ type: 'connection.lost', error: lostError });

    expect(linkState(connection.getSnapshot())).toBe('reconnecting');
    vi.advanceTimersByTime(offlineDelayMs - 1);
    expect(linkState(connection.getSnapshot())).toBe('reconnecting');
    vi.advanceTimersByTime(1);
    expect(linkState(connection.getSnapshot())).toBe('offline');
    expect(harness.refetches).toBe(0);
  });

  it('goes offline 10 seconds after the Connection is lost', () => {
    const connection = startConnection();
    loseOpenConnection();

    vi.advanceTimersByTime(offlineDelayMs - 1);
    expect(linkState(connection.getSnapshot())).toBe('reconnecting');
    vi.advanceTimersByTime(1);
    expect(linkState(connection.getSnapshot())).toBe('offline');
  });

  it('keeps a waiting attempt when it goes offline', () => {
    const connection = startConnection();
    loseOpenConnection();
    for (let attempt = 0; attempt < 4; attempt++)
      waitForAllowedAttempt(connection);
    // 7.5 seconds have passed; the next attempt waits 8 seconds.
    connection.send({ type: 'connection.attemptRequested' });

    vi.advanceTimersByTime(2500);
    expect(linkState(connection.getSnapshot())).toBe('offline');
    expect(harness.allowedAttempts).toBe(4);
    vi.advanceTimersByTime(5500);
    expect(harness.allowedAttempts).toBe(5);
  });

  it('Try again while offline allows a waiting attempt at once and shows Reconnecting', () => {
    const connection = startConnection();
    loseOpenConnection();
    vi.advanceTimersByTime(offlineDelayMs);
    connection.send({ type: 'connection.attemptRequested' });

    connection.send({ type: 'connection.retry' });

    expect(harness.allowedAttempts).toBe(1);
    expect(linkState(connection.getSnapshot())).toBe('reconnecting');
    vi.advanceTimersByTime(offlineDelayMs);
    expect(linkState(connection.getSnapshot())).toBe('offline');
  });

  it('ignores Try again while the Connection is open', () => {
    const connection = startConnection();
    harness.watcher.send({ type: 'connection.opened' });

    expect(connection.getSnapshot().can({ type: 'connection.retry' })).toBe(
      false,
    );
  });

  it('ignores another loss while it reconnects, so the offline delay keeps running', () => {
    const connection = startConnection();
    loseOpenConnection();

    vi.advanceTimersByTime(offlineDelayMs - 1);
    harness.watcher.send({ type: 'connection.lost', error: lostError });
    vi.advanceTimersByTime(1);

    expect(linkState(connection.getSnapshot())).toBe('offline');
  });
});
