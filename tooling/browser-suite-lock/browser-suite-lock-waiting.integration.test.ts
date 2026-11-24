import { once } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquireBrowserSuiteLock, type WaitReport } from './browser-suite-lock';
import {
  freePort,
  holdInAnotherProcess,
  OTHER_COMMAND,
  POLL_MS,
  stopOtherSuites,
} from './other-suite';

afterEach(stopOtherSuites);

describe('what a waiting suite is told', () => {
  it('hands the port to waiting processes in order, skipping one that exited', async () => {
    const port = await freePort();
    const release = await acquireBrowserSuiteLock({ port });
    const first = holdInAnotherProcess(port, true);
    await once(first.stdout, 'data');
    const abandoned = holdInAnotherProcess(port, true);
    await once(abandoned.stdout, 'data');
    const last = holdInAnotherProcess(port, true);
    await once(last.stdout, 'data');
    const acquired: string[] = [];

    const firstHeld = once(first.stdout, 'data').then(() =>
      acquired.push('first'),
    );

    const lastHeld = once(last.stdout, 'data').then(() =>
      acquired.push('last'),
    );

    abandoned.kill('SIGKILL');
    await once(abandoned, 'exit');
    release();
    await firstHeld;
    expect(acquired).toEqual(['first']);
    first.stdin.end();
    await lastHeld;
    expect(acquired).toEqual(['first', 'last']);
    last.stdin.end();
  });

  it('says what the holder runs, so a waiter can tell one file from the suite', async () => {
    const port = await freePort();
    const other = holdInAnotherProcess(port);
    await once(other.stdout, 'data');
    const onWait = vi.fn<WaitReport>();

    const acquired = acquireBrowserSuiteLock({ port, pollMs: POLL_MS, onWait });

    await vi.waitFor((): void =>
      expect(onWait).toHaveBeenCalledWith(
        expect.objectContaining({ command: OTHER_COMMAND }),
        expect.any(Number),
      ),
    );

    other.stdin.end();
    (await acquired)();
  });

  it('reports again while it keeps waiting, not only once', async () => {
    const port = await freePort();
    const other = holdInAnotherProcess(port);
    await once(other.stdout, 'data');
    const onWait = vi.fn<WaitReport>();

    const acquired = acquireBrowserSuiteLock({
      port,
      pollMs: POLL_MS,
      reportMs: POLL_MS * 2,
      onWait,
    });

    await vi.waitFor((): void =>
      expect(onWait.mock.calls.length).toBeGreaterThan(2),
    );

    other.stdin.end();
    (await acquired)();
  });
});

it('admits two processes and makes the next wait for either slot to open', async (): Promise<void> => {
  const port = await freePort();
  const extra = await freePort();
  const options = { port, additionalPorts: [extra], pollMs: POLL_MS };
  const releaseFirst = await acquireBrowserSuiteLock(options);
  const second = holdInAnotherProcess(port, true, [extra]);

  try {
    const [secondStatus] = await once(second.stdout, 'data');
    expect(String(secondStatus)).toBe('held');

    const third = holdInAnotherProcess(port, true, [extra]);
    const [thirdStatus] = await once(third.stdout, 'data');

    expect(String(thirdStatus)).toBe('waiting');

    const thirdHeld = once(third.stdout, 'data');

    second.kill('SIGKILL');

    const [admitted] = await thirdHeld;

    expect(String(admitted)).toBe('held');
    third.stdin.end();
  } finally {
    releaseFirst();
  }
});
