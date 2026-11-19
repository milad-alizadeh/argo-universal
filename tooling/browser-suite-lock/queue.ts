import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { appendFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { connect, createServer, type Server } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';
import { predecessors } from './queue-journal.ts';

const missingSocket = z.object({ code: z.enum(['ENOENT', 'ECONNREFUSED']) });

// A unique socket proves the process is alive even when the OS reuses its pid.
function address(token: string): string {
  return process.platform === 'win32'
    ? `\\\\.\\pipe\\argo-suite-${token}`
    : path.join('/tmp', `argo-suite-${token}.sock`);
}

async function alive(token: string): Promise<boolean> {
  const socket = connect(address(token));

  try {
    await once(socket, 'connect');

    return true;
  } catch (error) {
    if (missingSocket.safeParse(error).success) return false;
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

async function first(file: string, earlier: string[]): Promise<boolean> {
  for (let token = earlier.at(0); token; token = earlier.at(0)) {
    if (await alive(token)) return false;
    discard(file, token);
    earlier.shift();
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
  first: () => Promise<boolean>;
  acquired: () => void;
  close: () => void;
}

function register(file: string, token: string, socket: Server): QueueTicket {
  record(file, token, 'request');
  const earlier = predecessors(readFileSync(file, 'utf8'), token);

  return {
    first: () => first(file, earlier),
    acquired: () => record(file, token, 'acquire'),
    close() {
      socket.close();
      record(file, token, 'release');
    },
  };
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
): Promise<QueueTicket> {
  const token = randomUUID();
  const socket = await listen(token);

  try {
    return register(journal(port, production), token, socket);
  } catch (error) {
    socket.close();
    throw error;
  }
}
