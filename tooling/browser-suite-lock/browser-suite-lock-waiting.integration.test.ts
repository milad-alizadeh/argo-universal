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
