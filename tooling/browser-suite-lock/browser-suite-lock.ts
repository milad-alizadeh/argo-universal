import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import {
  type BrowserSuiteHolder,
  isAbandoned,
  readHolder,
  writeHolder,
} from './holder';

export type { BrowserSuiteHolder } from './holder';

// The user's temporary folder, so every checkout and agent of that user on the Mac shares one lock.
const SHARED_DIRECTORY = path.join(tmpdir(), 'argo-browser-suite.lock');

const POLL_MS = 2000;

const Taken = z.object({ code: z.literal('EEXIST') });

type Report = (holder: BrowserSuiteHolder) => void;

interface LockOptions {
  directory?: string;
  pollMs?: number;
  onWait?: Report;
}

interface Turn {
  taken: Promise<void>;
  holds: number;
}

// Vitest runs a project's global setup again for each browser instance, in the same process, so those calls share one turn.
const turns = new Map<string, Turn>();

function tryTake(directory: string): boolean {
  try {
    mkdirSync(directory);
  } catch (error) {
    if (Taken.safeParse(error).success) return false;
    throw error;
  }

  writeHolder(directory);

  return true;
}

// Renaming first means a waiter that loses the race to clear removes nothing.
function clear(directory: string): void {
  const doomed = `${directory}.abandoned-${process.pid}`;

  try {
    renameSync(directory, doomed);
  } catch {
    return;
  }

  rmSync(doomed, { recursive: true, force: true });
}

function onlyOnce(onWait: Report | undefined): Report {
  let reported = false;

  return (holder): void => {
    if (reported) return;
    reported = true;
    onWait?.(holder);
  };
}

async function waitTurn(
  directory: string,
  pollMs: number,
  report: Report,
): Promise<void> {
  const holder = readHolder(directory);

  if (isAbandoned(directory, holder)) {
    clear(directory);

    return;
  }

  if (holder) report(holder);
  await delay(pollMs);
}

async function takeTurn(
  directory: string,
  pollMs: number,
  onWait: Report | undefined,
): Promise<void> {
  const report = onlyOnce(onWait);

  while (!tryTake(directory)) await waitTurn(directory, pollMs, report);
}

function newTurn(
  directory: string,
  pollMs: number,
  onWait: Report | undefined,
): Turn {
  const turn = { taken: takeTurn(directory, pollMs, onWait), holds: 0 };

  turns.set(directory, turn);

  return turn;
}

function releaser(directory: string, turn: Turn): () => void {
  let released = false;

  const release = (): void => {
    if (released) return;
    released = true;
    turn.holds -= 1;

    if (turn.holds > 0) return;
    turns.delete(directory);
    clear(directory);
  };

  process.once('exit', release);

  return release;
}

// Waits until no other browser suite on this Mac runs, then holds the lock until the returned release or process exit.
export async function acquireBrowserSuiteLock(
  options: LockOptions = {},
): Promise<() => void> {
  const { directory, pollMs, onWait } = {
    directory: SHARED_DIRECTORY,
    pollMs: POLL_MS,
    ...options,
  };

  const turn = turns.get(directory) ?? newTurn(directory, pollMs, onWait);

  turn.holds += 1;
  await turn.taken;

  return releaser(directory, turn);
}

const printWaiting = ({ pid, cwd, since }: BrowserSuiteHolder): boolean =>
  process.stdout.write(
    `Waiting for the browser suite in ${cwd} (pid ${pid}, since ${since}) to finish; one runs at a time on this Mac.\n`,
  );

// CI runs one suite per runner, so only local runs queue.
export const lockBrowserSuite = async (): Promise<(() => void) | undefined> =>
  process.env.CI
    ? undefined
    : acquireBrowserSuiteLock({ onWait: printWaiting });
