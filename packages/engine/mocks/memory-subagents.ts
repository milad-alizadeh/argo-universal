import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { SessionUpdate } from '@repo/contracts';
import { feedRow, session as sessionRow } from '@repo/db/schema';
import type { ScriptedStep } from '@repo/mocks/agent/scripted-scenario';
import { and, asc, eq } from 'drizzle-orm';
import { onTestFinished } from 'vitest';
import { createActor, waitFor } from 'xstate';
import {
  feedMachine,
  hydrateStoredFeedRow,
  readQueuedFeedRow,
  readWrittenRow,
  storedFeedColumns,
  type FeedInput,
} from '../src/feed';
import {
  flushSubagents,
  noSubagents,
  ownsSubagentUpdate,
  routeSubagentUpdate,
  type SessionData,
  type SubagentSession,
  type Subagents,
} from '../src/sessions';
import {
  databaseWriterId,
  writerMachine,
  type WriterActorRef,
} from '../src/storage';
import { openTestDatabase } from './database';

type Database = ReturnType<typeof openTestDatabase>['database'];

const parentId = 'session-1';

const session = (vendorSessionId: string): SessionData => ({
  sessionId: parentId,
  projectId: 'project-1',
  agent: 'mock',
  vendorSessionId,
  checkout: { path: '/project', branch: null },
  configValues: [],
  heldConfig: [],
  epoch: 0,
  maxRevision: 0,
  activityAt: 0,
  nextPosition: 0,
  kept: false,
  undisclosedInterruptedTurnId: null,
});

const parentFeedInput = (
  database: Database,
  writer: WriterActorRef,
): FeedInput => {
  let created = 0;

  return {
    sessionId: parentId,
    epoch: 0,
    maxRevision: 0,
    nextPosition: 0,
    now: Date.now,
    createId: () => `parent-row-${++created}`,
    findWrittenRow: (id): SessionUpdate | undefined =>
      readWrittenRow({
        database,
        pending: readQueuedFeedRow(writer, { sessionId: parentId, id }),
        sessionId: parentId,
        id,
      }),
  };
};

// A Session's Subagents with a real Writer and real Feeds over a test database. `route` hands them an ACP update and keeps the state they return; `withoutFeed` routes as a Session that has no Feed; `play` routes the updates of scripted steps the Session would hand them, as the Agent's ACP Session `acpSessionId`; `settled` flushes every Feed and waits for the Writer; `rows` reads the stored Feed of the parent, or of the Subagent the Agent names.
export type MemorySubagents = {
  database: Database;
  state: () => Subagents;
  route: (notification: SessionNotification) => void;
  withoutFeed: (notification: SessionNotification) => void;
  play: (steps: readonly ScriptedStep[]) => void;
  flush: () => void;
  settled: () => Promise<void>;
  parentId: string;
  childId: (vendorId: string) => string;
  rows: (vendorId?: string) => SessionUpdate[];
};

// Feeds find the Writer through its system id, so the Writer is the root they start under.
const startWriter = (database: Database, directory: string): WriterActorRef => {
  const blobsFolder = join(directory, 'blobs');
  mkdirSync(blobsFolder);

  const writer = createActor(writerMachine, {
    input: { database, now: Date.now, blobsFolder },
    systemId: databaseWriterId,
  }).start();

  onTestFinished(() => {
    writer.stop();
  });

  return writer;
};

const sessionOf = (
  database: Database,
  writer: WriterActorRef,
  acpSessionId: string,
): SubagentSession => {
  let created = 0;

  return {
    parent: {
      ...session(acpSessionId),
      input: {
        database,
        now: Date.now,
        createId: () => `child-${++created}`,
        writer,
      },
    },
    parentFeed: undefined,
    spawn: (input) =>
      createActor(feedMachine, { input, parent: writer }).start(),
    storageFailing: () => {
      throw new Error('Storage failed');
    },
  };
};

const childIdOf = (database: Database, vendorId: string): string => {
  const child = database
    .select({ id: sessionRow.id })
    .from(sessionRow)
    .where(
      and(
        eq(sessionRow.parentSessionId, parentId),
        eq(sessionRow.vendorSessionId, vendorId),
      ),
    )
    .get();

  if (!child) throw new Error(`No Subagent ${vendorId} was stored`);

  return child.id;
};

const storedRows = (database: Database, sessionId: string): SessionUpdate[] =>
  database
    .select(storedFeedColumns)
    .from(feedRow)
    .where(eq(feedRow.sessionId, sessionId))
    .orderBy(asc(feedRow.position))
    .all()
    .map((row) => hydrateStoredFeedRow(sessionId, row));

// A scripted update with no session id arrives on the parent's own transcript.
const notificationOf = (
  step: Extract<ScriptedStep, { type: 'update' }>,
  acpSessionId: string,
): SessionNotification => ({
  sessionId: step.sessionId ?? acpSessionId,
  update: step.update,
});

export const openMemorySubagents = (
  acpSessionId = 'acp-session',
): MemorySubagents => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  const writer = startWriter(database, directory);
  const host = sessionOf(database, writer, acpSessionId);
  const parentFeed = host.spawn(parentFeedInput(database, writer));
  const withFeed = { ...host, parentFeed };
  let subagents = noSubagents;

  const route = (notification: SessionNotification): void => {
    subagents = routeSubagentUpdate(withFeed, subagents, notification);
  };

  const flush = (): void => {
    flushSubagents(subagents);
    parentFeed.send({ type: 'feed.flush' });
  };

  return {
    database,
    state: () => subagents,
    route,
    withoutFeed: (notification) => {
      routeSubagentUpdate(host, subagents, notification);
    },
    // Only the updates the Session's own guard would hand to its Subagents.
    play: (steps) => {
      for (const step of steps) {
        if (step.type !== 'update') continue;

        const notification = notificationOf(step, acpSessionId);

        if (ownsSubagentUpdate(subagents, notification)) route(notification);
      }
    },
    flush,
    settled: async () => {
      flush();
      await waitFor(
        writer,
        (snapshot) =>
          snapshot.matches('idle') && snapshot.context.queue.length === 0,
      );
    },
    parentId,
    childId: (vendorId) => childIdOf(database, vendorId),
    rows: (vendorId) =>
      storedRows(
        database,
        vendorId === undefined ? parentId : childIdOf(database, vendorId),
      ),
  };
};
