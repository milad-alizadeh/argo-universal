import { connect, createServer, type Server, type Socket } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';

// The kernel frees a listening port when its process ends however it ends, so a crashed suite never leaves the lock behind; below macOS's ephemeral range.
const LOCK_PORT = 47_291;

const HOST = '127.0.0.1';

const POLL_MS = 2000;

const READ_TIMEOUT_MS = 1000;

const holderSchema = z.object({
  pid: z.number(),
  cwd: z.string(),
  since: z.string(),
});

export type BrowserSuiteHolder = z.infer<typeof holderSchema>;

const InUse = z.object({ code: z.literal('EADDRINUSE') });

// Undefined when whatever holds the port does not say who it is.
type Report = (holder: BrowserSuiteHolder | undefined) => void;

interface LockSettings {
  port: number;
  pollMs: number;
  onWait?: Report;
}

interface Turn {
  taken: Promise<Server>;
  holds: number;
}

// Vitest runs a project's global setup again for each browser instance, in the same process, so those calls share one turn.
const turns = new Map<number, Turn>();

// Tells anyone who connects which suite holds the lock.
function serveHolder(): Server {
  const holder = JSON.stringify({
    pid: process.pid,
    cwd: process.cwd(),
    since: new Date().toISOString(),
  });

  return createServer((socket): void => {
    socket.end(holder);
  });
}

// False when another process already listens on the port.
async function listen(server: Server, port: number): Promise<boolean> {
  return new Promise((resolve, reject): void => {
    server.once('error', (error): void => {
      if (InUse.safeParse(error).success) resolve(false);
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

function onlyOnce(onWait: Report | undefined): Report {
  let reported = false;

  return (holder): void => {
    if (reported) return;
    reported = true;
    onWait?.(holder);
  };
}

async function takeTurn(
  settings: LockSettings,
  report: Report,
): Promise<Server> {
  const server = await tryTake(settings.port);

  if (server) return server;
  report(await readHolder(settings.port));
  await delay(settings.pollMs);

  return takeTurn(settings, report);
}

// A turn that failed, such as on a port it may not open, is dropped so the next call tries afresh.
async function takeOrForget(settings: LockSettings): Promise<Server> {
  try {
    return await takeTurn(settings, onlyOnce(settings.onWait));
  } catch (error) {
    turns.delete(settings.port);
    throw error;
  }
}

function newTurn(settings: LockSettings): Turn {
  const turn = { taken: takeOrForget(settings), holds: 0 };

  turns.set(settings.port, turn);

  return turn;
}

function releaser(port: number, turn: Turn, server: Server): () => void {
  let released = false;

  return (): void => {
    if (released) return;
    released = true;
    turn.holds -= 1;

    if (turn.holds > 0) return;
    turns.delete(port);
    server.close();
  };
}

// Waits until no other browser suite on this Mac runs, then holds the lock until the returned release or process exit.
export async function acquireBrowserSuiteLock(
  options: Partial<LockSettings> = {},
): Promise<() => void> {
  const settings = { port: LOCK_PORT, pollMs: POLL_MS, ...options };
  const turn = turns.get(settings.port) ?? newTurn(settings);

  turn.holds += 1;

  return releaser(settings.port, turn, await turn.taken);
}

const describeHolder = (holder: BrowserSuiteHolder | undefined): string =>
  holder
    ? `the browser suite in ${holder.cwd} (pid ${holder.pid}, since ${holder.since})`
    : `whatever holds port ${LOCK_PORT}`;

const printWaiting = (holder: BrowserSuiteHolder | undefined): boolean =>
  process.stdout.write(
    `Waiting for ${describeHolder(holder)} to finish; one browser suite runs at a time on this Mac.\n`,
  );

// CI runs one suite per runner, so only local runs queue.
export const lockBrowserSuite = async (): Promise<(() => void) | undefined> =>
  process.env.CI
    ? undefined
    : acquireBrowserSuiteLock({ onWait: printWaiting });
