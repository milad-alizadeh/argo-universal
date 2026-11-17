import { expect, it } from 'vitest';
import {
  failureBackoffMs,
  longestLimitMs,
  QueryRest,
  type RestServices,
} from './query-rest';

type Rest = { rest: QueryRest; later: (ms: number) => void };

// A rest on a clock the test turns, whose rate limit reopens `limitedFor` ms after the failed read.
function restOver(limitedFor?: number): Rest {
  let now = 1000;

  const services: RestServices = {
    now: (): number => now,
    schedule: (): (() => void) => (): void => {},
    limitedUntil: (): number | undefined =>
      limitedFor === undefined ? undefined : now + limitedFor,
  };

  return {
    rest: new QueryRest(services, (): void => {}),
    later: (ms): void => {
      now += ms;
    },
  };
}

it('rests for the backoff after a failed read, and not once a read answered', () => {
  const { rest, later } = restOver();

  rest.began();
  rest.read(false, false);
  expect(rest.resting).toBe(true);

  later(failureBackoffMs);
  expect(rest.resting).toBe(false);
});

it('waits out a rate limit, but never longer than the longest limit it will honour', () => {
  const tenHours = 10 * 3_600_000;
  const { rest, later } = restOver(tenHours);

  rest.began();
  rest.read(false, false);

  later(longestLimitMs - 1);
  expect(rest.resting).toBe(true);

  later(1);
  expect(rest.resting).toBe(false);
});

it('ends a rest when a read answers during it', () => {
  const { rest } = restOver();

  rest.began();
  rest.read(false, false);
  expect(rest.resting).toBe(true);

  rest.read(true, false);
  expect(rest.resting).toBe(false);
});

it('ends a rest for a read someone asked for, such as an Operation run’s, and not for one in the background', () => {
  const { rest } = restOver();

  rest.began();
  rest.read(false, false);
  rest.pulled({ fresh: false, asked: false });
  expect(rest.resting).toBe(true);

  rest.pulled({ fresh: false, asked: true });
  expect(rest.resting).toBe(false);
});
