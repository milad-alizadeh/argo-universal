import { type ChildProcessByStdio, spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Readable, Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  acquireBrowserSuiteLock,
  type BrowserSuiteHolder,
} from './browser-suite-lock';

const POLL_MS = 10;

const lockModule = new URL('browser-suite-lock.ts', import.meta.url).href;

// Another suite, loaded through tsx as the lock's modules import each other without extensions: holds the lock, says so on stdout, and releases when its stdin closes.
type OtherSuite = ChildProcessByStdio<Writable, Readable, null>;

const others: OtherSuite[] = [];

const holdInAnotherProcess = (directory: string): OtherSuite => {
  const other = spawn(
    process.execPath,
    [
      '--import',
      'tsx',
      '--input-type=module',
      '-e',
      `const { acquireBrowserSuiteLock } = await import(${JSON.stringify(lockModule)});
       const release = await acquireBrowserSuiteLock({ directory: ${JSON.stringify(directory)} });
       process.stdout.write('held');
       process.stdin.on('end', release).resume();`,
    ],
    { stdio: ['pipe', 'pipe', 'inherit'] },
  );

  others.push(other);

  return other;
};

let scratch: string;

let directory: string;

beforeEach((): void => {
  scratch = mkdtempSync(path.join(tmpdir(), 'browser-suite-lock-'));
  directory = path.join(scratch, 'lock');
});

afterEach(async (): Promise<void> => {
  const running = others
    .splice(0)
    .filter((other): boolean => other.exitCode === null);

  for (const other of running) other.kill();
  await Promise.all(running.map((other) => once(other, 'exit')));
  rmSync(scratch, { recursive: true, force: true });
});

describe('acquireBrowserSuiteLock on a real lock directory', () => {
  it('makes a suite wait, naming the other process that holds it, until that one releases', async () => {
    const other = holdInAnotherProcess(directory);
    await once(other.stdout, 'data');
    const onWait = vi.fn<(holder: BrowserSuiteHolder) => void>();
    let holds = false;

    const acquired = acquireBrowserSuiteLock({
      directory,
      pollMs: POLL_MS,
      onWait,
    }).then((release): (() => void) => {
      holds = true;

      return release;
    });

    await vi.waitFor((): void => expect(onWait).toHaveBeenCalledOnce());
    expect(holds).toBe(false);
    expect(onWait).toHaveBeenCalledWith(
      expect.objectContaining({ pid: other.pid }),
    );

    other.stdin.end();
    const release = await acquired;

    expect(holds).toBe(true);
    release();
  });

  // Vitest runs a project's global setup again for each browser instance, in the same process.
  it('lets the holding process take it again, keeping it until both release', async () => {
    const releaseProject = await acquireBrowserSuiteLock({
      directory,
      pollMs: POLL_MS,
    });

    const onWait = vi.fn<(holder: BrowserSuiteHolder) => void>();

    const releaseInstance = await acquireBrowserSuiteLock({
      directory,
      pollMs: POLL_MS,
      onWait,
    });

    releaseInstance();

    expect(existsSync(directory)).toBe(true);

    releaseProject();

    expect(onWait).not.toHaveBeenCalled();
    expect(existsSync(directory)).toBe(false);
  });

  it('takes over a lock whose holder has exited', async () => {
    const exitedPid = spawnSync(process.execPath, ['-e', '']).pid;
    mkdirSync(directory);
    writeFileSync(
      path.join(directory, 'holder.json'),
      JSON.stringify({ pid: exitedPid, cwd: scratch, since: '' }),
    );
    const onWait = vi.fn<(holder: BrowserSuiteHolder) => void>();

    const release = await acquireBrowserSuiteLock({
      directory,
      pollMs: POLL_MS,
      onWait,
    });

    expect(onWait).not.toHaveBeenCalled();
    release();
  });
});
