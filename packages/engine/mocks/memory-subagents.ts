import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SessionNotification } from '@agentclientprotocol/sdk';
import type { SessionUpdate } from '@repo/contracts';
import { onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import { feedMachine, type FeedActorRef, type FeedInput } from '../src/feed';
import {
  flushSubagents,
  noSubagents,
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

const session: SessionData = {
  sessionId: 'session-1',
  projectId: 'project-1',
  agent: 'mock',
  vendorSessionId: null,
  checkout: { path: '/project', branch: null },
  configValues: [],
  heldConfig: [],
  epoch: 0,
  maxRevision: 0,
  activityAt: 0,
  nextPosition: 0,
  kept: false,
  undisclosedInterruptedTurnId: null,
};

const parentFeedInput: FeedInput = {
  sessionId: 'session-1',
  epoch: 0,
  maxRevision: 0,
  nextPosition: 0,
  now: Date.now,
  createId: () => 'parent-row',
  findWrittenRow: (): SessionUpdate | undefined => void 0,
};

// A Session's Subagents with a real Writer and real Feeds over a test database. `route` hands them an ACP update and keeps the state they return; `withoutFeed` routes as a Session that has no Feed.
export type MemorySubagents = {
  database: Database;
  state: () => Subagents;
  route: (notification: SessionNotification) => void;
  withoutFeed: (notification: SessionNotification) => void;
  flush: () => void;
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
  parentFeed?: FeedActorRef,
): SubagentSession => {
  let created = 0;

  return {
    parent: {
      ...session,
      input: {
        database,
        now: Date.now,
        createId: () => `child-${++created}`,
        writer,
      },
    },
    parentFeed,
    spawn: (input) =>
      createActor(feedMachine, { input, parent: writer }).start(),
    storageFailing: () => {
      throw new Error('Storage failed');
    },
  };
};

export const openMemorySubagents = (): MemorySubagents => {
  const { database, directory, remove } = openTestDatabase();
  onTestFinished(remove);
  const writer = startWriter(database, directory);
  const host = sessionOf(database, writer);
  const parentFeed = host.spawn(parentFeedInput);
  const withFeed = { ...host, parentFeed };
  let subagents = noSubagents;

  return {
    database,
    state: () => subagents,
    route: (notification) => {
      subagents = routeSubagentUpdate(withFeed, subagents, notification);
    },
    withoutFeed: (notification) => {
      routeSubagentUpdate(host, subagents, notification);
    },
    flush: () => {
      flushSubagents(subagents);
      parentFeed.send({ type: 'feed.flush' });
    },
  };
};
