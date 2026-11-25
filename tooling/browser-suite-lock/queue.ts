import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { appendFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { connect, createServer, type Server, type Socket } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { predecessors } from './queue-journal.ts';

const missingSocket = z.object({ code: z.enum(['ENOENT', 'ECONNREFUSED']) });

const resetSocket = z.object({ code: z.literal('ECONNRESET') });

// A unique socket proves the process is alive even when the OS reuses its pid.
function address(token: string): string {
  return process.platform === 'win32'
    ? `\\\\.\\pipe\\argo-suite-${token}`
    : path.join('/tmp', `argo-suite-${token}.sock`);
}

type Dial = (address: string) => Socket;

async function blocksTurn(token: string, dial: Dial): Promise<boolean> {
  const socket = dial(address(token));

  try {
    await once(socket, 'connect');

    return true;
  } catch (error) {
    if (missingSocket.safeParse(error).success) return false;

    // A listener can close during connect. Probe again before discarding its ticket.
    if (resetSocket.safeParse(error).success) return true;

    throw error;
  } finally {
    socket.destroy();
  }
}

type Event = 'request' | 'acquire' | 'release' | 'gone';

function record(file: string, token: string, event: Event): void {
  appendFileSync(file, `${Date.now()} ${token} ${event}\n`, { mode: 0o600 });
}

function discard(file: string, token: string): void {
  record(file, token, 'gone');

  if (process.platform !== 'win32') rmSync(address(token), { force: true });
}

type Predecessors = { file: string; earlier: Set<string>; dial: Dial };

async function first(
  { file, earlier, dial }: Predecessors,
  slots: number,
): Promise<boolean> {
  let pending = 0;

  for (const token of earlier) {
    if (await blocksTurn(token, dial)) {
      pending++;

      if (pending >= slots) return false;
    } else {
      discard(file, token);
      earlier.delete(token);
    }
  }

  return true;
}

function journal(port: number, production: boolean): string {
  const directory = path.join(
    production ? homedir() : tmpdir(),
    '.cache',
    'argo-browser-suite',
  );

  mkdirSync(directory, { recursive: true, mode: 0o700 });

  return path.join(directory, `${port}.log`);
}

export interface QueueTicket {
  first: (slots?: number) => Promise<boolean>;
  acquired: () => void;
  close: () => void;
}

async function listen(token: string): Promise<Server> {
  const socket = createServer((connection) => connection.end());
  socket.listen(address(token));
  await once(socket, 'listening');

  return socket.unref();
}

export async function enqueue(
  port: number,
  production: boolean,
  dial: Dial = connect,
): Promise<QueueTicket> {
  const token = randomUUID();
  const socket = await listen(token);

  try {
    const file = journal(port, production);

    record(file, token, 'request');
    const earlier = new Set(predecessors(readFileSync(file, 'utf8'), token));

    return {
      first: (slots = 1) => first({ file, earlier, dial }, slots),
      acquired: () => record(file, token, 'acquire'),
      close() {
        socket.close();
        record(file, token, 'release');
      },
    };
  } catch (error) {
    socket.close();
    throw error;
  }
}
