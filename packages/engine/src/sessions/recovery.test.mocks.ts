import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type Database, openDatabase } from '@repo/db';
import { feedRow, project, session, turn } from '@repo/db/schema';
import { afterEach, beforeEach } from 'vitest';
import { type ActorRefFrom, createActor, waitFor } from 'xstate';
import { engineMachine, type EngineMessage } from '#mocks/engine';

export let home: string;

let engine: ActorRefFrom<typeof engineMachine>;

export let messages: EngineMessage[];

export let rowsAtReady: ReturnType<typeof readRows>[];

interface StoredRows {
  turns: (typeof turn.$inferSelect)[];
  rows: (typeof feedRow.$inferSelect)[];
  sessions: (typeof session.$inferSelect)[];
}

export const readRows = (database: Database): StoredRows => ({
  turns: database.select().from(turn).orderBy(turn.id).all(),
  rows: database
    .select()
    .from(feedRow)
    .orderBy(feedRow.sessionId, feedRow.position)
    .all(),
  sessions: database.select().from(session).orderBy(session.id).all(),
});

export const readStoredRows = (): ReturnType<typeof readRows> => {
  const database = openDatabase(join(home, 'argo.db'));

  try {
    return readRows(database);
  } finally {
    database.$client.close();
  }
};

export const startEngine = async (): Promise<
  ReturnType<typeof engine.getSnapshot>
> => {
  engine = createActor(
    engineMachine.provide({
      actions: {
        log: (): void => {},
        sendToSupervisor: ({ context }, message): void => {
          messages.push(message);

          if (message.type === 'ready' && context.database)
            rowsAtReady.push(readRows(context.database));
        },
      },
    }),
    {
      input: {
        now: (): number => Date.now(),
        createId: randomUUID,
        home,
        cliEntry: '/unused/argo.mjs',
        port: 0,
        version: 'test',
        startedAt: new Date().toISOString(),
      },
    },
  ).start();
  await waitFor(
    engine,
    (snapshot): boolean =>
      snapshot.context.server !== null || snapshot.status === 'done',
  );

  return engine.getSnapshot();
};

export const interruptEngine = async (): Promise<void> => {
  const { database, server } = engine.getSnapshot().context;
  engine.stop();
  await server?.close();
  database?.$client.close();
};

const fail = (message: string): never => {
  throw new Error(message);
};

export const readyRows = (): ReturnType<typeof readRows> =>
  rowsAtReady[0] ?? fail('The Engine did not report ready');

export const engineDatabase = (): Database =>
  engine.getSnapshot().context.database ?? fail('The Engine has no database');

beforeEach(async (): Promise<void> => {
  home = mkdtempSync(join(tmpdir(), 'argo-recovery-'));
  messages = [];
  rowsAtReady = [];
  await startEngine();
  const database = engineDatabase();
  database
    .insert(project)
    .values({ id: 'project', path: '/project', name: 'Project' })
    .run();
  database
    .insert(session)
    .values(
      ['session-1', 'session-2'].map(
        (
          id,
        ): Pick<
          typeof session.$inferSelect,
          | 'id'
          | 'projectId'
          | 'agent'
          | 'checkoutPath'
          | 'projectionVersion'
          | 'epoch'
        > => ({
          id,
          projectId: 'project',
          agent: 'mock',
          checkoutPath: '/project',
          projectionVersion: 1,
          epoch: 3,
        }),
      ),
    )
    .run();
});

afterEach(async (): Promise<void> => {
  if (engine.getSnapshot().status === 'active') await interruptEngine();
  rmSync(home, { recursive: true, force: true });
});
