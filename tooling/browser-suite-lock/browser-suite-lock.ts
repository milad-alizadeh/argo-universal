import type { Server } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { tryTake, readHolder, type BrowserSuiteHolder } from './holder-port.ts';

export type { BrowserSuiteHolder } from './holder-port.ts';

import { enqueue, type QueueTicket } from './queue.ts';
import { formatDuration, printWaiting } from './wait-message.ts';

// The kernel frees a listening port when its process ends however it ends, so a crashed suite never leaves the lock behind; below macOS's ephemeral range.
const LOCK_PORT = 47_291;

const POLL_MS = 2000;

// A waiting run says again how long it has waited, so a long queue never reads as a hang.
const REPORT_MS = 60_000;

// Set for the commands `pnpm quality` runs while it holds the lock, so their own suites do not wait on it.
export const HELD_VARIABLE = 'ARGO_BROWSER_SUITE_LOCK_HELD';

// Undefined when whatever holds the port does not say who it is.
export type WaitReport = (
  holder: BrowserSuiteHolder | undefined,
  waitedMs: number,
) => void;

interface LockSettings {
  port: number;
  additionalPorts: readonly number[];
  sharedQueue: boolean;
  pollMs: number;
  reportMs: number;
  onWait?: WaitReport;
}

// One process's hold on the lock, which its callers share.
interface SharedHold {
  server: Promise<() => void>;
  holders: number;
}

// Vitest runs a project's global setup again for each browser instance, in the same process, so those calls share one hold.
const holds = new Map<number, SharedHold>();

// Reports at once, then again each `reportMs`, however often the port is polled.
function spaced(settings: LockSettings): WaitReport {
  const onWait = settings.onWait ?? ((): void => undefined);
  let last = -Infinity;

  return (holder, waitedMs): void => {
    if (waitedMs - last < settings.reportMs) return;
    last = waitedMs;
    onWait(holder, waitedMs);
  };
}

async function tryInOrder(
  ports: readonly number[],
  ticket: QueueTicket,
): Promise<Server | undefined> {
  if (!(await ticket.first(ports.length))) return undefined;

  for (const port of ports) {
    const server = await tryTake(port);

    if (server) return server;
  }

  return undefined;
}

async function waitForPort(
  settings: LockSettings,
  ticket: QueueTicket,
): Promise<Server> {
  const started = Date.now();
  const report = spaced(settings);
  const ports = [settings.port, ...settings.additionalPorts];

  for (;;) {
    const server = await tryInOrder(ports, ticket);

    if (server) return server;
    report(await readHolder(settings.port), Date.now() - started);
    await delay(settings.pollMs);
  }
}

async function claim(
  settings: LockSettings,
  ticket: QueueTicket,
): Promise<Server> {
  let server: Server | undefined;

  try {
    server = await waitForPort(settings, ticket);
    ticket.acquired();

    return server;
  } catch (error) {
    server?.close();
    ticket.close();
    throw error;
  }
}

async function takeTurn(settings: LockSettings): Promise<() => void> {
  const requested = Date.now();
  const local = settings.port === LOCK_PORT;
  const ticket = await enqueue(settings.port, local || settings.sharedQueue);
  const server = await claim(settings, ticket);
  const started = Date.now();

  return (): void => {
    server.close();
    ticket.close();

    if (local)
      process.stdout.write(
        `Browser suite waited ${formatDuration(started - requested)} and ran for ${formatDuration(Date.now() - started)}.\n`,
      );
  };
}

function newHold(settings: LockSettings): SharedHold {
  const hold = {
    server: takeTurn(settings).catch((error: Error) => {
      holds.delete(settings.port);
      throw error;
    }),
    holders: 0,
  };

  holds.set(settings.port, hold);

  return hold;
}

function releaser(
  port: number,
  hold: SharedHold,
  release: () => void,
): () => void {
  let released = false;

  return (): void => {
    if (released) return;
    released = true;
    hold.holders -= 1;

    if (hold.holders > 0) return;
    holds.delete(port);
    release();
  };
}

// Waits until no other browser suite on this Mac runs, then holds the lock until the returned release or process exit.
export async function acquireBrowserSuiteLock(
  options: Partial<LockSettings> = {},
): Promise<() => void> {
  const settings = {
    port: LOCK_PORT,
    additionalPorts: [],
    sharedQueue: false,
    pollMs: POLL_MS,
    reportMs: REPORT_MS,
    ...options,
  };

  const hold = holds.get(settings.port) ?? newHold(settings);

  hold.holders += 1;

  return releaser(settings.port, hold, await hold.server);
}

// CI runs one suite per runner, so only local runs queue, and a run inside a held `pnpm quality` is already in its turn.
export const lockBrowserSuite = async (): Promise<(() => void) | undefined> =>
  process.env.CI || process.env[HELD_VARIABLE] === '1'
    ? undefined
    : acquireBrowserSuiteLock({ onWait: printWaiting });

export { releaseAtRunEnd, runHostSchema } from './release-at-run-end.ts';
