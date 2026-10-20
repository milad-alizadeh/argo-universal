import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Connection,
  offlineDelayMs,
  retryDelayBaseMs,
  retryDelayCapMs,
} from './connection';
import { type FakeLink, fakeLink } from './connection.mocks.ts';

let link: FakeLink;

let connection: Connection;

let allowed: number;

beforeEach(() => {
  vi.useFakeTimers();
  link = fakeLink();
  connection = link.connection;
  allowed = 0;
});

afterEach(() => {
  connection.stop();
  vi.useRealTimers();
});

const open = (): void => link.open();

const lose = (): void => link.lose();

const loseOpenConnection = (): void => {
  open();
  lose();
};

const requestAttempt = (): void => {
  // A waiting attempt is refused when the test stops the Connection.
  connection.nextAttempt().then(
    () => {
      allowed += 1;
    },
    () => {},
  );
};

// Requests an attempt and returns how long the gate waited before it allowed it.
async function waitForAllowedAttempt(): Promise<number> {
  const before = allowed;
  requestAttempt();
  let waited = 0;
  await vi.advanceTimersByTimeAsync(0);

  while (allowed === before) {
    if (waited >= 60_000) throw new Error('The attempt was never allowed');
    await vi.advanceTimersByTimeAsync(100);
    waited += 100;
  }

  return waited;
}

describe('Connection state', () => {
  it('starts connecting and opens when the WebSocket opens', () => {
    expect(connection.state()).toBe('connecting');

    open();

    expect(connection.state()).toBe('open');
  });

  it('goes offline 10 seconds after the Connection is lost', () => {
    loseOpenConnection();

    vi.advanceTimersByTime(offlineDelayMs - 1);
    expect(connection.state()).toBe('reconnecting');
    vi.advanceTimersByTime(1);
    expect(connection.state()).toBe('offline');
  });

  it('a loss before the first open goes offline after the same delay', () => {
    lose();

    vi.advanceTimersByTime(offlineDelayMs);

    expect(connection.state()).toBe('offline');
  });

  it('ignores another loss while it reconnects, so the offline delay keeps running', () => {
    loseOpenConnection();

    vi.advanceTimersByTime(offlineDelayMs - 1);
    lose();
    vi.advanceTimersByTime(1);

    expect(connection.state()).toBe('offline');
  });

  it('opens again from offline', () => {
    loseOpenConnection();
    vi.advanceTimersByTime(offlineDelayMs);

    open();

    expect(connection.state()).toBe('open');
  });
});

// Enough attempts to reach the cap and stay on it twice more.
const attemptsPastCap =
  Math.ceil(Math.log2(retryDelayCapMs / retryDelayBaseMs)) + 3;

describe('Connection attempts', () => {
  it('allows the first attempt at once', async () => {
    expect(await waitForAllowedAttempt()).toBe(0);
  });

  it('doubles the retry delay from its base up to its cap', async () => {
    loseOpenConnection();
    const waits: number[] = [];

    for (let attempt = 0; attempt < attemptsPastCap; attempt++)
      waits.push(await waitForAllowedAttempt());

    expect(waits[0]).toBe(retryDelayBaseMs);
    expect(waits.slice(1)).toEqual(
      waits
        .map((previous) => Math.min(previous * 2, retryDelayCapMs))
        .slice(0, -1),
    );
    expect(waits.at(-1)).toBe(retryDelayCapMs);
  });

  it('starts the retry delay over after the Connection opens', async () => {
    loseOpenConnection();

    for (let attempt = 0; attempt < 4; attempt++) await waitForAllowedAttempt();
    loseOpenConnection();

    expect(await waitForAllowedAttempt()).toBe(retryDelayBaseMs);
  });

  it('allows a waiting attempt at once when the App comes to the foreground', async () => {
    loseOpenConnection();
    requestAttempt();

    connection.foreground();
    await vi.advanceTimersByTimeAsync(0);

    expect(allowed).toBe(1);
  });

  it('Try again while offline allows a waiting attempt at once and shows Reconnecting', async () => {
    loseOpenConnection();
    vi.advanceTimersByTime(offlineDelayMs);
    requestAttempt();

    connection.retry();
    await vi.advanceTimersByTimeAsync(0);

    expect(allowed).toBe(1);
    expect(connection.state()).toBe('reconnecting');
    vi.advanceTimersByTime(offlineDelayMs);
    expect(connection.state()).toBe('offline');
  });

  it('ignores Try again while the Connection is open', async () => {
    open();
    requestAttempt();

    connection.retry();
    await vi.advanceTimersByTimeAsync(0);

    expect(allowed).toBe(0);
    expect(connection.state()).toBe('open');
  });

  it('refuses a waiting attempt once the Connection stops', async () => {
    loseOpenConnection();
    const attempt = connection.nextAttempt();

    connection.stop();

    await expect(attempt).rejects.toThrow('The Connection is closed');
  });
});
