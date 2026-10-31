import { once } from 'node:events';
import { connect, createServer } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquireBrowserSuiteLock, type WaitReport } from './browser-suite-lock';
import {
  freePort,
  HOST,
  holdInAnotherProcess,
  isHeld,
  POLL_MS,
  stopOtherSuites,
} from './other-suite';

afterEach(stopOtherSuites);

describe('acquireBrowserSuiteLock on a real port', () => {
  it('makes a suite wait until the other process holding it releases', async () => {
    const port = await freePort();
    const other = holdInAnotherProcess(port);
    await once(other.stdout, 'data');
    const onWait = vi.fn<WaitReport>();
    let holds = false;

    const acquired = acquireBrowserSuiteLock({
      port,
      pollMs: POLL_MS,
      onWait,
    }).then((release): (() => void) => {
      holds = true;

      return release;
    });

    await vi.waitFor((): void => expect(onWait).toHaveBeenCalledOnce());
    expect(holds).toBe(false);

    other.stdin.end();
    const release = await acquired;

    expect(holds).toBe(true);
    release();
  });

  it('names the process that holds it while a suite waits', async () => {
    const port = await freePort();
    const other = holdInAnotherProcess(port);
    await once(other.stdout, 'data');
    const onWait = vi.fn<WaitReport>();

    const acquired = acquireBrowserSuiteLock({ port, pollMs: POLL_MS, onWait });

    await vi.waitFor((): void =>
      expect(onWait).toHaveBeenCalledWith(
        expect.objectContaining({ pid: other.pid }),
        expect.any(Number),
      ),
    );

    other.stdin.end();
    (await acquired)();
  });

  it('reports an unknown holder when another program holds the port', async () => {
    const port = await freePort();

    const program = createServer((socket): void => {
      socket.end('not a holder');
    }).listen(port, HOST);

    await once(program, 'listening');
    const onWait = vi.fn<WaitReport>();

    const acquired = acquireBrowserSuiteLock({ port, pollMs: POLL_MS, onWait });

    await vi.waitFor((): void =>
      expect(onWait).toHaveBeenCalledWith(undefined, expect.any(Number)),
    );

    program.close();
    (await acquired)();
  });

  // Vitest runs a project's global setup again for each browser instance, in the same process.
  it('lets the holding process take it again, keeping it until both release', async () => {
    const port = await freePort();
    const onWait = vi.fn<WaitReport>();

    const releaseProject = await acquireBrowserSuiteLock({
      port,
      pollMs: POLL_MS,
    });

    const releaseInstance = await acquireBrowserSuiteLock({
      port,
      pollMs: POLL_MS,
      onWait,
    });

    releaseInstance();

    await expect(isHeld(port)).resolves.toBe(true);

    releaseProject();

    expect(onWait).not.toHaveBeenCalled();
    await expect(isHeld(port)).resolves.toBe(false);
  });

  it('keeps holding when a waiter hangs up mid-answer', async () => {
    const port = await freePort();
    const release = await acquireBrowserSuiteLock({ port, pollMs: POLL_MS });
    const waiter = connect({ port, host: HOST });

    await once(waiter, 'connect');
    waiter.resetAndDestroy();
    await once(waiter, 'close');

    await expect(isHeld(port)).resolves.toBe(true);
    release();
  });

  it('frees the lock when its holder is killed without releasing', async () => {
    const port = await freePort();
    const other = holdInAnotherProcess(port);
    await once(other.stdout, 'data');

    other.kill('SIGKILL');
    await once(other, 'exit');
    const onWait = vi.fn<WaitReport>();

    const release = await acquireBrowserSuiteLock({
      port,
      pollMs: POLL_MS,
      onWait,
    });

    expect(onWait).not.toHaveBeenCalled();
    release();
  });
});
