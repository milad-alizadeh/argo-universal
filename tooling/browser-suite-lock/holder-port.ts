import { connect, createServer, type Server, type Socket } from 'node:net';
import { z } from 'zod';
import { describeCommand } from './describe-command.ts';

const HOST = '127.0.0.1';

const READ_TIMEOUT_MS = 1000;

const holderSchema = z.object({
  pid: z.number(),
  cwd: z.string(),
  // A date the waiter can subtract from, never text that prints as NaN.
  since: z.iso.datetime(),
  // What the holder runs, so a waiter can tell one test file from the whole suite; absent from a holder that predates it.
  command: z.string().optional(),
});

export type BrowserSuiteHolder = z.infer<typeof holderSchema>;

const portInUseSchema = z.object({ code: z.literal('EADDRINUSE') });

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

export async function tryTake(port: number): Promise<Server | undefined> {
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

export async function readHolder(
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
