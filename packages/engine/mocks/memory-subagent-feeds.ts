import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SessionUpdate } from '@repo/contracts';
import { onTestFinished } from 'vitest';
import { createActor } from 'xstate';
import {
  feedMachine,
  readQueuedFeedRow,
  readWrittenRow,
  type FeedInput,
} from '../src/feed';
import type { SessionData, SubagentSession } from '../src/sessions';
import {
  databaseWriterId,
  writerMachine,
  type WriterActorRef,
} from '../src/storage';
import type { openTestDatabase } from './database';

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

const idCounter = (prefix: string): (() => string) => {
  let created = 0;

  return (): string => `${prefix}-${++created}`;
};

export const parentFeedInput = (
  database: Database,
  writer: WriterActorRef,
): FeedInput => ({
  sessionId: parentId,
  epoch: 0,
  maxRevision: 0,
  nextPosition: 0,
  now: Date.now,
  createId: idCounter('parent-row'),
  findWrittenRow: (id): SessionUpdate | undefined =>
    parentWrittenRow(database, writer, id),
});

const parentWrittenRow = (
  database: Database,
  writer: WriterActorRef,
  id: string,
): SessionUpdate | undefined =>
  readWrittenRow({
    database,
    pending: readQueuedFeedRow(writer, { sessionId: parentId, id }),
    sessionId: parentId,
    id,
  });

// Feeds find the Writer through its system id, so the Writer is the root they start under.
export const startWriter = (
  database: Database,
  directory: string,
): WriterActorRef => {
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

export const sessionOf = (
  database: Database,
  writer: WriterActorRef,
  acpSessionId: string,
): SubagentSession => ({
  parent: parentSession(database, writer, acpSessionId),
  parentFeed: undefined,
  spawn: (input) => createActor(feedMachine, { input, parent: writer }).start(),
  storageFailing: () => {
    throw new Error('Storage failed');
  },
});

const parentSession = (
  database: Database,
  writer: WriterActorRef,
  acpSessionId: string,
): SubagentSession['parent'] => ({
  ...session(acpSessionId),
  input: { database, now: Date.now, createId: idCounter('child'), writer },
});
