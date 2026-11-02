import { randomUUID } from 'node:crypto';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { request, type RequestOptions } from 'node:http';
import type { Database } from '@repo/db';
import { afterEach, beforeEach } from 'vitest';
import { WebSocket } from 'ws';
import { openTestDatabase } from '#mocks/database';
import { startEngineTestHost } from '#mocks/engine';
import { type HttpServerOptions } from '../src/engine/http-server';
import { SessionTokens } from '../src/operations';
import type { OpenSessionsActorRef } from '../src/sessions';
import { userTokenHeaders } from './engine-proof';

export let home: string;

export let port: number;

export let database: Database;

let sessions: OpenSessionsActorRef;

let databaseWriter: HttpServerOptions['databaseWriter'];

let removeDatabase: () => void;

export let closeServer: () => Promise<void>;

// Resolves with the HTTP status of the upgrade: 101 when the WebSocket opens.
export const upgradeStatus = (
  headers: Record<string, string>,
): Promise<number> =>
  new Promise<number>((resolve, reject): void => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`, { headers });
    socket.once('open', (): void => {
      socket.close();
      resolve(101);
    });
    socket.once('unexpected-response', (_request, response): void => {
      resolve(response.statusCode ?? 0);
      response.resume();
    });
    socket.once('error', reject);
  });

// Resolves with the HTTP status of system.info over HTTP, asked as this computer's own tooling asks it.
export async function systemInfoStatus(
  headers: Record<string, string> = {},
): Promise<number> {
  const proof = await userTokenHeaders(home);

  return requestStatus(systemRequestOptions({ ...proof, ...headers }));
}

const requestStatus = (options: RequestOptions): Promise<number> =>
  new Promise<number>((resolve, reject): void => {
    const outgoing = request(options, (response): void => {
      resolve(response.statusCode ?? 0);
      response.resume();
    });

    outgoing.once('error', reject);
    outgoing.end();
  });

function systemRequestOptions(headers: Record<string, string>): RequestOptions {
  return {
    host: '127.0.0.1',
    port,
    path: '/trpc/system.info',
    headers: { host: `127.0.0.1:${port}`, ...headers },
  };
}

export const readdirSafe = (folder: string): string[] =>
  existsSync(folder) ? readdirSync(folder) : [];

export const options = (): HttpServerOptions => ({
  sessionTokens: new SessionTokens(),
  createId: randomUUID,
  home,
  port,
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  database,
  sessions,
  databaseWriter,
  registry: sessions.system.get('registry'),
});

beforeEach(async (): Promise<void> => {
  const stored = openTestDatabase();
  database = stored.database;
  removeDatabase = stored.remove;
  const started = await startEngineTestHost({ database });
  home = started.home;
  port = Number(new URL(started.url).port);
  sessions = started.openSessions;
  databaseWriter = started.databaseWriter;
  closeServer = started.stop;
});

afterEach(async (): Promise<void> => {
  await closeServer();
  removeDatabase();
  rmSync(home, { recursive: true, force: true });
});

export function replaceHttpHost(
  host: Awaited<ReturnType<typeof startEngineTestHost>>,
): void {
  closeServer = host.stop;
  port = Number(new URL(host.url).port);
}
