import { type ChildProcessByStdio, spawn } from 'node:child_process';
import { once } from 'node:events';
import { connect, createServer } from 'node:net';
import type { Readable, Writable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquireBrowserSuiteLock, type WaitReport } from './browser-suite-lock';

const POLL_MS = 10;

const HOST = '127.0.0.1';

const lockModule = new URL('browser-suite-lock.ts', import.meta.url).href;

type OtherSuite = ChildProcessByStdio<Writable, Readable, null>;

const others: OtherSuite[] = [];

// Another suite: holds the lock, says so on stdout, and releases when its stdin closes.
const holdInAnotherProcess = (port: number): OtherSuite => {
  const other = spawn(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `const { acquireBrowserSuiteLock } = await import(${JSON.stringify(lockModule)});
       const release = await acquireBrowserSuiteLock({ port: ${port} });
       process.stdout.write('held');
       process.stdin.on('end', release).resume();`,
    ],
    { stdio: ['pipe', 'pipe', 'inherit'] },
  );

  others.push(other);

  return other;
};

async function freePort(): Promise<number> {
  const server = createServer().listen(0, HOST);
  await once(server, 'listening');
  const address = server.address();
  server.close();

  return typeof address === 'object' && address ? address.port : 0;
}

async function isHeld(port: number): Promise<boolean> {
  const socket = connect({ port, host: HOST });

  const connected = await new Promise<boolean>((resolve): void => {
    socket.once('connect', (): void => {
      resolve(true);
    });
    socket.once('error', (): void => {
      resolve(false);
    });
  });

  socket.destroy();

  return connected;
}

afterEach(async (): Promise<void> => {
  const running = others
    .splice(0)
    .filter(
      (other): boolean => other.exitCode === null && other.signalCode === null,
    );

  for (const other of running) other.kill();
  await Promise.all(running.map((other) => once(other, 'exit')));
});

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
      expect(onWait).toHaveBeenCalledWith(undefined),
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
