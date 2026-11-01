import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type Connection, retryDelayCapMs } from './connection';
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

const requestAttempt = (): void => {
  // A waiting attempt is refused when the test stops the Connection.
  connection.nextAttempt().then(
    () => {
      allowed += 1;
    },
    () => {},
  );
};

describe('a Server that refuses this Device', () => {
  it('reads not-allowed, and a lost link does not turn it back into reconnecting', () => {
    link.open();
    connection.refuse();
    link.lose();

    expect(connection.state()).toBe('not-allowed');
  });

  it('never allows another attempt, however long it waits or the App returns to the foreground', async () => {
    connection.refuse();
    requestAttempt();
    connection.foreground();
    connection.retry();
    await vi.advanceTimersByTimeAsync(retryDelayCapMs * 4);

    expect(allowed).toBe(0);
  });
});
