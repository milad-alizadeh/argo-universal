import { connect, createServer, type Server, type Socket } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import { describeCommand } from './describe-command.ts';
import { printWaiting } from './wait-message.ts';

// The kernel frees a listening port when its process ends however it ends, so a crashed suite never leaves the lock behind; below macOS's ephemeral range.
const LOCK_PORT = 47_291;

const HOST = '127.0.0.1';

const POLL_MS = 2000;

// A waiting run says again how long it has waited, so a long queue never reads as a hang.
const REPORT_MS = 60_000;

const READ_TIMEOUT_MS = 1000;

const holderSchema = z.object({
  pid: z.number(),
  cwd: z.string(),
  since: z.string(),
  // What the holder runs, so a waiter can tell one test file from the whole suite; absent from a holder that predates it.
  command: z.string().optional(),
});

export type BrowserSuiteHolder = z.infer<typeof holderSchema>;

const portInUseSchema = z.object({ code: z.literal('EADDRINUSE') });

// Set for the commands `pnpm quality` runs while it holds the lock, so their own suites do not wait on it.
export const HELD_VARIABLE = 'ARGO_BROWSER_SUITE_LOCK_HELD';

// Undefined when whatever holds the port does not say who it is.
export type WaitReport = (
  holder: BrowserSuiteHolder | undefined,
  waitedMs: number,
) => void;

interface LockSettings {
  port: number;
  pollMs: number;
  reportMs: number;
  onWait?: WaitReport;
}

// One process's hold on the lock, which its callers share.
interface SharedHold {
  server: Promise<Server>;
  holders: number;
}

// Vitest runs a project's global setup again for each browser instance, in the same process, so those calls share one hold.
const holds = new Map<number, SharedHold>();

// Tells anyone who connects which suite holds the lock.
function serveHolder(): Server {
  const holder = JSON.stringify({
    pid: process.pid,
    cwd: process.cwd(),
    since: new Date().toISOString(),
    command: describeCommand(process.argv),
  });

  return createServer((socket): void => {
    // A waiter that hangs up early resets the connection; that must never crash the suite holding the lock.
    socket.on('error', (): void => {
      socket.destroy();
    });
    socket.end(holder);
  });
}

// False when another process already listens on the port.
async function listen(server: Server, port: number): Promise<boolean> {
  return new Promise((resolve, reject): void => {
    server.once('error', (error): void => {
      if (portInUseSchema.safeParse(error).success) resolve(false);
      else reject(error);
    });

    server.listen({ port, host: HOST, exclusive: true }, (): void => {
      resolve(true);
    });
  });
}

async function tryTake(port: number): Promise<Server | undefined> {
  const server = serveHolder();

  // An open lock never keeps a finished suite's process alive.
  return (await listen(server, port)) ? server.unref() : undefined;
}

function parseHolder(text: string): BrowserSuiteHolder | undefined {
  try {
    return holderSchema.parse(JSON.parse(text));
  } catch {
    return undefined;
  }
}

async function readAll(socket: Socket): Promise<string> {
  let text = '';

  socket.on('data', (chunk: string): void => {
    text += chunk;
  });

  return new Promise((resolve): void => {
    socket.once('close', (): void => {
      resolve(text);
    });
  });
}

async function readHolder(
  port: number,
): Promise<BrowserSuiteHolder | undefined> {
  const socket = connect({ port, host: HOST });

  const stop = (): void => {
    socket.destroy();
  };

  socket.setEncoding('utf8').setTimeout(READ_TIMEOUT_MS);
  socket.once('timeout', stop).once('error', stop);

  return parseHolder(await readAll(socket));
}

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

async function waitForPort(
  settings: LockSettings,
  report: WaitReport,
  started: number,
): Promise<Server> {
  const server = await tryTake(settings.port);

  if (server) return server;
  report(await readHolder(settings.port), Date.now() - started);
  await delay(settings.pollMs);

  return waitForPort(settings, report, started);
}

function newHold(settings: LockSettings): SharedHold {
  const hold = {
    server: waitForPort(settings, spaced(settings), Date.now()),
    holders: 0,
  };

  holds.set(settings.port, hold);

  return hold;
}

function releaser(port: number, hold: SharedHold, server: Server): () => void {
  let released = false;

  return (): void => {
    if (released) return;
    released = true;
    hold.holders -= 1;

    if (hold.holders > 0) return;
    holds.delete(port);
    server.close();
  };
}

// Waits until no other browser suite on this Mac runs, then holds the lock until the returned release or process exit.
export async function acquireBrowserSuiteLock(
  options: Partial<LockSettings> = {},
): Promise<() => void> {
  const settings = {
    port: LOCK_PORT,
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
