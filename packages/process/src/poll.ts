import { setTimeout as delay } from 'node:timers/promises';
import { millisecondsPerSecond, pollIntervalMs, startLimitMs } from './timing';

// Answers undefined until what it waits for is there.
export type Check<T> = () => T | undefined | Promise<T | undefined>;

const answerBefore = async <T>(
  check: Check<T>,
  deadline: number,
): Promise<T | undefined> => {
  while (Date.now() < deadline) {
    const answer = await check();

    if (answer !== undefined) return answer;
    await delay(pollIntervalMs);
  }

  return undefined;
};

// Runs `check` every pollIntervalMs until it answers; past `limitMs` it fails with `failure` and the limit in seconds.
export async function pollUntil<T>(
  check: Check<T>,
  failure: string,
  limitMs = startLimitMs,
): Promise<T> {
  const answer = await answerBefore(check, Date.now() + limitMs);

  if (answer !== undefined) return answer;

  throw new Error(`${failure} within ${limitMs / millisecondsPerSecond} s`);
}
